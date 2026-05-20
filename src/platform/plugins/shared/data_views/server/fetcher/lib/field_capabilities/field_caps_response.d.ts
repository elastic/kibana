import type { estypes } from '@elastic/elasticsearch';
import type { FieldDescriptor } from '../..';
/**
 *  Read the response from the _field_caps API to determine the type and
 *  "aggregatable"/"searchable" status of each field.
 *
 *  For reference, the _field_caps response should look like this:
 *
 *  {
 *    "fields": {
 *      "<fieldName>": {
 *        "<esType>": {
 *          "type": "<esType>",
 *          "searchable": true,
 *          "aggregatable": false,
 *          // "indices" is only included when multiple
 *          // types are found for a single field
 *          "indices": [
 *            "<index>"
 *          ]
 *        },
 *        "<esType2>": {
 *          "type": "<esType2>",
 *          "searchable": true,
 *          ...
 *
 *  Returned array includes an object for each field in the _field_caps
 *  response. When the field uses the same configuration across all indices
 *  it should look something like this:
 *
 *    {
 *      "name": "<fieldName>"
 *      "type": "<kbnType>",
 *      "aggregatable": <bool>,
 *      "searchable": <bool>,
 *    }
 *
 *  If the field has different data types in indices it will be of type
 *  "conflict" and include a description of where conflicts can be found
 *
 *    {
 *      "name": "<fieldName>",
 *      "type": "conflict",
 *      "aggregatable": false,
 *      "searchable": false,
 *      conflictDescriptions: {
 *        "<esType1>": [
 *          "<index1>"
 *        ],
 *        "<esType2>": [
 *          "<index2>"
 *        ]
 *      }
 *    }
 *
 *  @param {FieldCapsResponse} fieldCapsResponse
 *  @return {Array<FieldDescriptor>}
 */
export declare function readFieldCapsResponse(fieldCapsResponse: estypes.FieldCapsResponse): FieldDescriptor[];
