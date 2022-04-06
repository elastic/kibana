/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile';

interface MapboxVectorTileJson {
  [key: string]: {};
}

export function convertMapboxVectorTileToJson(response: VectorTile) {
  const data = response.layers;
  const output: MapboxVectorTileJson = {};

  for (const property in data) {
    if (data.hasOwnProperty(property)) {
      const propertyObject = data[property];
      const featuresArray = [];

      for (let index = 0; index < propertyObject.length; index++) {
        const feature = propertyObject.feature(index);
        const properties = feature.properties;
        const geometry = feature.loadGeometry()[0];
        const typeName = VectorTileFeature.types[feature.type];
        let coordinates = [];

        const coordinatesArray = [];
        for (const value of geometry) {
          coordinatesArray.push([value.x, value.y]);
        }

        switch (feature.type) {
          case 1:
            coordinates.push(geometry[0].x, geometry[0].y);
            break;
          case 2: {
            coordinates = coordinatesArray;
            break;
          }
          case 3: {
            coordinates.push(coordinatesArray);
            break;
          }
        }

        featuresArray.push({
          geometry: {
            type: typeName,
            coordinates,
          },
          properties,
        });
      }

      output[property] = [...featuresArray];
    }
  }

  const sortedOutput = Object.fromEntries(Object.entries(output).sort().reverse()); // "meta" layer is now in top of the result

  return JSON.stringify(sortedOutput, null, '\t');
}
