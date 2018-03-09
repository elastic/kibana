import { callIndexMappingApi } from '../es_api';

/*
  In order to determine if the indices contain nested fields,
  we need to look at the mapping and find any `nested` types.
  Once we have that, we need to look at all the subproperties
  of that type and flatten them so they appear like they do
  within the field list. That's half the battle. The other
  half involves returning the paths to the nested fields
  which are necessary when performing a nested query against
  ES. It's important to include the paths because there can be
  nested fields within nested fields.

  The result of this function will be an object map, like
  ```
  {
    [nestedField: string]: nestedPaths: array
  }
  ```

  For example, imagine `users` is a nested type and the doc
  looks like:
  ```
  {
    "users": [
      {
        "first": "Chris",
        "last": "Roberson",
        "time": "2018-01-16T13:00:00.000Z"
      }
    ]
  }
  ```

  This function would return:
  ```
  {
    "users.first": ["users"],
    "users.last": ["users"],
    "users.time": ["users"],
  }
  ```
*/
export async function getNestedFields(callCluster, indexPattern) {
  const response = await callIndexMappingApi(callCluster, indexPattern);
  let nestedFields = {};
  // The response will contain the matches indices from the pattern
  // but we don't really care about that, we just want the mappings
  for (const { mappings } of Object.values(response)) {
    // The mappings are keyed by the index type (`doc`), again we
    // don't care about that, we just need the properties
    for (const { properties } of Object.values(mappings)) {
      // Get a mapping between nested path and list of nested fields
      const groupedNestedFields = groupNestedPathsByNestedFields(properties);
      nestedFields = { ...nestedFields, ...groupedNestedFields };
    }
  }
  return nestedFields;
}

/**
 * Given an input like:
 * ```
 * {
    "users" : {
      "type" : "nested",
      "properties" : {
        "first" : {
          "type" : "text"
        },
        "last" : {
          "type" : "text"
        },
        "location" : {
          "type" : "nested",
          "properties" : {
            "city" : {
              "type" : "text"
            }
          }
        }
      }
    }
  }
 * ```
 *
 * This function will return:
 * ```
 * {
    'users.first.keyword': [ 'users' ],
    'users.last.keyword': [ 'users' ],
    'users.location.city': [ 'users', 'users.location' ],
    'users.location.city.keyword': [ 'users', 'users.location' ],
    'users.first': [ 'users' ],
    'users.last': [ 'users' ],
    'users.location': [ 'users' ],
    'users.time': [ 'users' ]
  }
 * ```
 *
 * It basically is just grouping the existing data to make it easier
 * to see which fields are nested and the paths to that nested path
 * which is necessary for nested queries to ES
 */
function groupNestedPathsByNestedFields(properties, parentNestedPath = []) {
  let nests = {};

  for (const [typeName, { type, properties }] of Object.entries(properties)) {
    if (type === 'nested') {
      const nestedPath = parentNestedPath.concat(typeName).join('.');
      const nestedFields = findAllFieldsForNestedType(nestedPath, properties);
      const nestedFieldToPaths = nestedFields.reduce((acc, field) => ({
        ...acc,
        [field]: parentNestedPath.concat(nestedPath)
      }), {});

      nests = { ...nests, ...nestedFieldToPaths };
    }

    if (properties) {
      const subNestedFields = groupNestedPathsByNestedFields(properties, [typeName]);
      nests = { ...nests, ...subNestedFields };
    }
  }

  return nests;
}

function findAllFieldsForNestedType(nestedType, properties) {
  const nestedFields = [];
  const fields = Object.keys(properties);

  for (const fieldName of fields) {
    const fieldMapping = properties[fieldName];

    // If this field contains subfields, grab all of those
    if (fieldMapping.fields) {
      nestedFields.push(...findAllFieldsForNestedType(`${nestedType}.${fieldName}`, fieldMapping.fields));
    }

    // If thise field has it's own properties (most likely `object` datatype)
    if (fieldMapping.properties) {
      for (const [subField, subFieldMapping] of Object.entries(fieldMapping.properties)) {
        /*
          [1] We only add it here if there is a type.

          Consider this structure:
          ```
          {
            "users": [
              {
                "first": "Chris",
                "last": "Roberson",
                "time": "2018-01-16T13:00:00.000Z",
                "location": {
                  "city": "Webster"
                }
              }
            ]
          }
          ```

          We do not want to add `users.location` to the list of nested fields
          because it isn't a field itself, it just contains fields. (Basically,
          a `object` datatype)
        */
        if (subFieldMapping.type) {
          nestedFields.push(`${nestedType}.${fieldName}.${subField}`);
        }
        if (subFieldMapping.fields) {
          nestedFields.push(...findAllFieldsForNestedType(`${nestedType}.${fieldName}.${subField}`, subFieldMapping.fields));
        }
      }
    }
  }

  // See [1]. We only want actual fields
  const typedFields = fields.filter(field => properties[field].type);
  nestedFields.push(...typedFields.map(field => `${nestedType}.${field}`));

  return nestedFields;
}
