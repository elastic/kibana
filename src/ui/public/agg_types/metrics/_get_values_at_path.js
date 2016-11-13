/**
 * Returns the values at path, regardless if there are arrays on the way.
 * Therefore, there is no need to specify the offset in an array.
 * For example, for the path aaa.bbb and a JSON object like:
 *
 * {
 *    "aaa": [
 *       {
 *          "bbb": 123
 *       },
 *       {
 *          "bbb": 456
 *       }
 *    ]
 * }
 *
 * the values returned are 123 and 456.
 *
 *
 * @param json the JSON object
 * @param path the path as an array
 * @returns an array with all the values reachable from path
 */
export default function (json, path) {
  if (!path || !path.length) {
    return [];
  }

  const values = [];

  const getValues = function (element, pathIndex) {
    if (!element) {
      return;
    }

    if (pathIndex >= path.length) {
      if (element) {
        if (element.constructor === Array) {
          for (let i = 0; i < element.length; i++) {
            if (element[i]) {
              values.push(element[i]);
            }
          }
        } else {
          values.push(element);
        }
      }
    } else if (element.constructor === Object) {
      if (element.hasOwnProperty(path[pathIndex])) {
        getValues(element[path[pathIndex]], pathIndex + 1);
      }
    } else if (element.constructor === Array) {
      for (let childi = 0; childi < element.length; childi++) {
        getValues(element[childi], pathIndex);
      }
    }
  };

  getValues(json, 0);
  return values;
};
