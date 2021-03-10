/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chunk } from 'lodash';
import { i18n } from '@kbn/i18n';

export enum ColorSchemas {
  Blues = 'Blues',
  Greens = 'Greens',
  Greys = 'Greys',
  Reds = 'Reds',
  YellowToRed = 'Yellow to Red',
  GreenToRed = 'Green to Red',
}

export interface ColorSchema {
  value: ColorSchemas;
  text: string;
}

export interface RawColorSchema {
  id: ColorSchemas;
  label: string;
  value: Array<[number, number[]]>;
}

export interface ColorMap {
  [key: string]: RawColorSchema;
}

/**
 * Decompresses a color scheme from the compressed string to decrease bundle size.
 * 
 * If the color schema ever has to be changed, the following script can be used to generate:
 ```
  const first = values.shift();
  const seed = [first[0] * 1000, first[1][0] * 1000, first[1][1] * 1000, first[1][2] * 1000];
  const compressed: number[][] = [];
  const converted: number[][] = [];
  values.forEach((v) => {
    const current = [v[0] * 1000, v[1][0] * 1000, v[1][1] * 1000, v[1][2] * 1000];
    const previous = converted.length === 0 ? seed : converted[converted.length - 1];
    converted.push(current);
    const diff = [
      current[0] - previous[0],
      current[1] - previous[1],
      current[2] - previous[2],
      current[3] - previous[3],
    ];
    compressed.push(diff);
  });
  const arr = new Int8Array(flatten(compressed));
  const compressedString = Buffer.from(arr).toString('base64').replace(/AAAA/g, '#');
 ```
 * 
 * @param compressedString Color scheme generated with the script above
 * @param first First entry of the values
 */
export function decompress(compressedString: string, first: [number, [number, number, number]]) {
  const raw = atob(compressedString.replace(/#/g, 'AAAA'));
  const rawLength = raw.length;
  const array = new Int8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  const restored = [first];
  chunk(array, 4).forEach((currentChunk) => {
    const last = restored[restored.length - 1];
    const current: [number, [number, number, number]] = [
      (last[0] * 1000 + currentChunk[0]) / 1000,
      [
        (last[1][0] * 1000 + currentChunk[1]) / 1000,
        (last[1][1] * 1000 + currentChunk[2]) / 1000,
        (last[1][2] * 1000 + currentChunk[3]) / 1000,
      ],
    ];
    restored.push(current);
  });

  return restored;
}

export const vislibColorMaps: ColorMap = {
  // Sequential
  [ColorSchemas.Blues]: {
    id: ColorSchemas.Blues,
    label: i18n.translate('charts.colormaps.bluesText', {
      defaultMessage: 'Blues',
    }),
    value: decompress(
      'Ag#L9/v8C#Avz+/wI#C/f7/Ag#L9/v8C#Av3+/wI#B/f//Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/P7/Ag#L9/v8C#Av3+/wE#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Avz+/wE#C/f7/Ag#L9/v8C#Av3+AAI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av7//wI#C/f7/Ag#L9/v8C#Af3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8B#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#L9/v8C#Av3+/wI#C/v7/Ag#L9/v8C#Av3+/wI#C/f7/Ag#H8/v8C#Avv+/gI#C+/7+Ag#L7/v8C#Avz+/gI#C+/7+Ag#L7/v4C#Avv+/wI#C+/7+Ag#L7/f4C#Avv+/wI#C+/7+AQ#L7/v4C#Avv+/gI#C+/7/Ag#L7/v4C#Avz+/gI#C+/7/Ag#L7/v4C#Avv+/gI#C+/3+Ag#L7/v8C#Avv+/gI#C+/7+AQ#L7/v4C#Avv+/wI#C+/7+Ag#L7/v4C#Avv+/wI#C/P7+Ag#L7/v4C#Avv9/gI#C+v7/Ag#L6/P4C#Avr9/wI#B+f3/Ag#L6/P4C#Avr9/wI#C+vz/Ag#L5/f4C#Avr8/wI#C+v3/Ag#L6/P4C#Avn9/wI#C+v3/Ag#L6/P4C#Avn9/wE#C+vz/Ag#L6/f4C#Avr8/wI#C+f3+Ag#L6/P8C#Avr9/wI#C+f3+Ag#L6/P8C#Avr9/wI#C+vz+Ag#L5/f8C#Afr8/wI#C+v3+Ag#L6/P8C#Avn9/wI#C+v3+Ag#L6/P8C#Avr9/gI#C+/z+Ag#L7/f4C#Avv8/gI#C+/3+Ag#L7/P4C#Afv9/gI#C+/3+Ag#L7/P4C#Avv9/wI#C+/z+Ag#L7/f4C#Avv8/gI#C+/3+Ag#L6/P4C#Avv9/gI#C+/3+Ag#L7/P4B#Avv9/gI#C+/z+Ag#L7/f4C#Avv8/gI#C+/3+Ag#L7/P4C#Avv9/gI#C+/3+Ag#L7/P4C#Avv9/gI#C+/z+Ag#H7/f4C#Avv8/gI#C+/3+Ag#L7/P4C#Avz8/gI#C/Pz+Ag#L8/P4C#Avz8/gI#C/Pz+Ag#L8/P4C#Avz8/gI#C/Pz9AQ#L8+/4C#Avz8/gI#C/Pz+Ag#L8/P4C#Avz8/gI#C+/z+Ag#L8/P4C#Avz8/gI#C/Pz+Ag#L8/P4C#Avz8/QI#C/Pz+AQ#L8/P4C#Avz8/gI#C/Pz+Ag#L8/P4C#Avz8/gI#C/Pv+Ag#L8/P4C#Avz8/gI#C/Pz+Ag#L7/P0C#Avz8/gI#B/fz9Ag#L9/P0C#Av38/QI#C/fz9Ag#L9/P0C#Av38/QI#C/f39Ag#L9/P0C#Avz8/QI#C/fz9Ag#L9/P0C#Av38/QE#C/fz9Ag#L9/P0C#Av38/AI#C/fz9Ag#L9/P0C#Av38/QI#C/fz9Ag#L9/P0C#Av38/QI#C/f39Ag#L8/P0C#Af38/QI#C/fz9Ag#L9/P0C#Av38/QI#C/fz8Ag#L9/P0C#Av38/QI#C/fz9Ag#L9/P0C#Av/8+gI#CAPz6Ag#IA/PoB#AgD8+gI#CAPz6Ag#IA/PoC#AgD8+gI#CAPz6Ag#IA/PoC#AgD8+gI#CAPv6Ag#IA/PoC#AgD8+gI#CAPz6Ag#IA/PoB#AgD8+gI#CAPz6Ag#IA/PoC#AgD8+gI#CAPz6Ag#IA/PoC#AgD8+gI#CAPz6Ag#IA/PoC#AgD8+gI#CAPz6Ag#EA/PoC#AgD7+gI#CAPz6Ag#IA/PoC#AgD8+gI#CAPz6Ag#==',
      [0.0, [0.969, 0.984, 1.0]]
    ),
  },
  [ColorSchemas.Greens]: {
    id: ColorSchemas.Greens,
    label: i18n.translate('charts.colormaps.greensText', {
      defaultMessage: 'Greens',
    }),
    value: decompress(
      'Ag#L9//0C#Av4A/gI#C/v/9Ag#L+//0C#Av7//gI#B/f/9Ag#L+//4C#Av7//QI#C/v/+Ag#L9AP0C#Av7//QI#C/v/+Ag#L+//0C#Av7//gI#C/f/9Ag#L+//0C#Av4A/gE#C/v/9Ag#L+//4C#Av3//QI#C/v/+Ag#L+//0C#Av7//QI#C/QD+Ag#L+//0C#Av7//gI#C/v/9Ag#L+//0C#Av3//gE#C/v/9Ag#L+AP4C#Av7//QI#C/P78Ag#L8//wC#Av3+/AI#C/P/8Ag#L8/vwC#Avz//AI#C/f78Ag#L8//wC#Afz+/QI#C/f/8Ag#L8/vwC#Avz//AI#C/f78Ag#L8//wC#Avz+/AI#C/f/8Ag#L8//wC#Avz+/AI#C/P/8Ag#L9/vwB#Avz//AI#C/P78Ag#L9//wC#Avz+/AI#C/P/9Ag#L9/vwC#Avz//AI#C/P78Ag#L9//wC#Avz+/AI#C/P/8Ag#H8/vwC#Avz++wI#C+/78Ag#L7/vsC#Avz+/AI#C+/77Ag#L7/vsC#Avv+/AI#C/P77Ag#L7//wC#Avv++wI#C/P78AQ#L7/vsC#Avv+/AI#C/P77Ag#L7/vwC#Avv++wI#C/P77Ag#L7/vwC#Avv++wI#C/P78Ag#L7/vsC#Avv+/AI#C/P77AQ#L7/vwC#Avv++wI#C/P77Ag#L7/vwC#Avv++wI#C/P78Ag#L7/vsC#Avv+/AI#C+/77Ag#L7/fwC#Avr++wI#B+/37Ag#L6/vwC#Avv9+wI#C+v78Ag#L7/fsC#Avr9/AI#C+v77Ag#L7/fwC#Avr++wI#C+/38Ag#L6/fsC#Avv++wE#C+v38Ag#L7/vsC#Avr9/AI#C+/77Ag#L6/fwC#Avv9+wI#C+v78Ag#L6/fsC#Avv++wI#C+v38Ag#L7/fsC#Afr+/AI#C+/37Ag#L6/vwC#Avv9+wI#C+v78Ag#L7/fsC#Avr9/AI#C+f39Ag#L6/f0C#Avr9/QI#C+v39Ag#L5/f0C#Afr9/QI#C+v39Ag#L6/P0C#Avn9/QI#C+v38Ag#L6/f0C#Avn9/QI#C+v39Ag#L6/f0C#Avr9/QI#C+f39Ag#L6/f0B#Avr9/QI#C+v39Ag#L5/f0C#Avr8/QI#C+v39Ag#L5/fwC#Avr9/QI#C+v39Ag#L6/f0C#Avn9/QI#C+v39Ag#H6/f0C#Avr9/QI#C+f39Ag#L8/P0C#Avz8/QI#C/Pz9Ag#L9/P0C#Avz8/QI#C/Pz9Ag#L8/f0C#Av38/QI#C/Pz9AQ#L8/P0C#Av38/QI#C/Pz9Ag#L8/P0C#Av38/QI#C/Pz+Ag#L8/P0C#Av38/QI#C/Pz9Ag#L8/P0C#Avz8/QI#C/fz9AQ#L8/P0C#Avz9/QI#C/fz9Ag#L8/P0C#Avz8/QI#C/fz9Ag#L8/P0C#Avz8/QI#C/fz9Ag#L8/P0C#Avz8/QI#B/Pz9Ag#L8/f0C#Avv8/QI#C/Pz9Ag#L8/f0C#Avv8/QI#C/Pz9Ag#L8/P0C#Avz9/QI#C+/z9Ag#L8/P0C#Avz9/AE#C+/z9Ag#L8/P0C#Avz9/QI#C+/z9Ag#L8/P0C#Avz9/QI#C/Pz9Ag#L7/P0C#Avz9/QI#C/Pz9Ag#L7/P0C#Afz8/QI#C/P38Ag#L7/P0C#Avz8/QI#C/P39Ag#L7/P0C#Avz8/QI#C/P39Ag#L8/P0C#Av/7/gI#CAPv+Ag#IA+/4B#AgD7/QI#CAPv+Ag#IA+/4C#AgD7/gI#CAPv+Ag#IA+/4C#AgD7/gI#CAPv+Ag#IA+/4C#AgD7/gI#CAPr+Ag#IA+/0B#AgD7/gI#CAPv+Ag#IA+/4C#AgD7/gI#CAPv+Ag#IA+/4C#AgD7/gI#CAPv+Ag#IA+/4C#AgD7/gI#CAPv9Ag#EA+/4C#AgD7/gI#CAPv+Ag#IA+/4C#AgD7/gI#CAPv+Ag#==',
      [0.0, [0.969, 0.988, 0.961]]
    ),
  },
  [ColorSchemas.Greys]: {
    id: ColorSchemas.Greys,
    label: i18n.translate('charts.colormaps.greysText', {
      defaultMessage: 'Greys',
    }),
    value: decompress(
      'Ag#L+/v4C#Av7+/gI#C/v7+Ag#L///8C#Av7+/gI#B/v7+Ag#L+/v4C#Av7+/gI#C/v7+Ag#L///8C#Av7+/gI#C/v7+Ag#L+/v4C#Av7+/gI#C/v7+Ag#L+/v4C#Av///wE#C/v7+Ag#L+/v4C#Av7+/gI#C/v7+Ag#L+/v4C#Av///wI#C/v7+Ag#L+/v4C#Av7+/gI#C/v7+Ag#L+/v4C#Av7+/gE#C////Ag#L+/v4C#Av7+/gI#C/f39Ag#L9/f0C#Av39/QI#C/v7+Ag#L9/f0C#Av39/QI#C/f39Ag#L9/f0C#Af39/QI#C/v7+Ag#L9/f0C#Av39/QI#C/f39Ag#L9/f0C#Av39/QI#C/v7+Ag#L9/f0C#Av39/QI#C/f39Ag#L9/f0B#Av39/QI#C/v7+Ag#L9/f0C#Av39/QI#C/f39Ag#L9/f0C#Av39/QI#C/v7+Ag#L9/f0C#Av39/QI#C/f39Ag#H9/f0C#Av39/QI#C/Pz8Ag#L9/f0C#Avz8/AI#C/f39Ag#L8/PwC#Av39/QI#C/f39Ag#L8/PwC#Av39/QI#C/Pz8AQ#L9/f0C#Avz8/AI#C/f39Ag#L8/PwC#Av39/QI#C/f39Ag#L8/PwC#Av39/QI#C/Pz8Ag#L9/f0C#Avz8/AI#C/f39AQ#L8/PwC#Av39/QI#C/f39Ag#L8/PwC#Av39/QI#C/Pz8Ag#L9/f0C#Avz8/AI#C/Pz8Ag#L8/PwC#Avv7+wI#B+/v7Ag#L7+/sC#Avv7+wI#C/Pz8Ag#L7+/sC#Avv7+wI#C+/v7Ag#L7+/sC#Avz8/AI#C+/v7Ag#L7+/sC#Avv7+wE#C+/v7Ag#L8/PwC#Avv7+wI#C+/v7Ag#L7+/sC#Avv7+wI#C/Pz8Ag#L7+/sC#Avv7+wI#C+/v7Ag#L7+/sC#Afz8/AI#C+/v7Ag#L7+/sC#Avv7+wI#C+/v7Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L7+/sC#Avz8/AI#C/Pz8Ag#L8/PwC#Afv7+wI#C/Pz8Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L8/PwB#Avz8/AI#C+/v7Ag#L8/PwC#Avz8/AI#C+/v7Ag#L8/PwC#Avz8/AI#C+/v7Ag#L8/PwC#Avz8/AI#C/Pz8Ag#H7+/sC#Avz8/AI#C/Pz8Ag#L7+/sC#Avz8/AI#C/Pz8Ag#L8/PwC#Avz8/AI#C/Pz8Ag#L8/PwC#Avz8/AI#C/Pz8AQ#L8/PwC#Avz8/AI#C/Pz8Ag#L8/PwC#Avz8/AI#C/Pz8Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L8/PwC#Avz8/AI#C/Pz8AQ#L8/PwC#Avz8/AI#C/Pz8Ag#L8/PwC#Avz8/AI#C/Pz8Ag#L8/PwC#Avz8/AI#C/Pz8Ag#L8/PwC#Avz8/AI#B+vr6Ag#L7+/sC#Avr6+gI#C+/v7Ag#L6+voC#Avv7+wI#C+vr6Ag#L7+/sC#Avr6+gI#C+/v7Ag#L6+voC#Avv7+wE#C+vr6Ag#L6+voC#Avv7+wI#C+vr6Ag#L7+/sC#Avr6+gI#C+/v7Ag#L6+voC#Avv7+wI#C+vr6Ag#L7+/sC#Afr6+gI#C+/v7Ag#L6+voC#Avr6+gI#C+/v7Ag#L6+voC#Avv7+wI#C+vr6Ag#L7+/sC#Avv7+wI#C/Pz8Ag#L7+/sB#Avv7+wI#C/Pz8Ag#L7+/sC#Avz8/AI#C+/v7Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L7+/sC#Avv7+wI#C/Pz8Ag#L7+/sB#Avz8/AI#C+/v7Ag#L8/PwC#Avv7+wI#C/Pz8Ag#L7+/sC#Avz8/AI#C+/v7Ag#L7+/sC#Avz8/AI#C+/v7Ag#H8/PwC#Avv7+wI#C/Pz8Ag#L7+/sC#Avz8/AI#C+/v7Ag#==',
      [0.0, [1.0, 1.0, 1.0]]
    ),
  },
  [ColorSchemas.Reds]: {
    id: ColorSchemas.Reds,
    label: i18n.translate('charts.colormaps.redsText', {
      defaultMessage: 'Reds',
    }),
    value: decompress(
      'Ag#IA/fwC#AgD+/QI#CAP38Ag#IA/fwC#Av/+/QI#BAP38Ag#IA/vwC#AgD9/QI#CAP78Ag#IA/fwC#AgD9/QI#CAP78Ag#L//fwC#AgD+/QI#CAP38Ag#IA/fwC#AgD+/AE#CAP39Ag#IA/vwC#AgD9/AI#C//79Ag#IA/fwC#AgD9/AI#CAP79Ag#IA/fwC#AgD+/AI#CAP39Ag#IA/fwC#Av/+/AE#CAP38Ag#IA/v0C#AgD9/AI#CAPv6Ag#IA/PoC#Av/7+gI#CAPz6Ag#IA+/oC#AgD8+gI#C//v6Ag#IA+/oC#AQD8+gI#CAPv5Ag#L//PoC#AgD7+gI#CAPz6Ag#IA+/oC#Av/8+gI#CAPv6Ag#IA+/oC#AgD8+gI#C//v6Ag#IA/PoB#AgD7+gI#CAPz6Ag#L/+/oC#AgD8+gI#CAPv6Ag#IA/PoC#Av/7+gI#CAPv6Ag#IA/PoC#AgD7+gI#C//z6Ag#EA+/oC#AgD7+gI#CAPv6Ag#IA+/sC#AgD7+gI#CAPv6Ag#IA+/oC#AgD7+gI#CAPv7Ag#IA+/oC#AgD7+gI#CAPv6AQ#IA+/sC#AgD6+gI#CAPv6Ag#IA+/oC#AgD7+gI#CAPv7Ag#IA+/oC#AgD7+gI#CAPv6Ag#IA+/oC#AgD7+wI#CAPv6AQ#IA+/oC#AgD7+gI#CAPv7Ag#IA+/oC#AgD7+gI#CAPv6Ag#IA+/oC#AgD7+wI#CAPv6Ag#IA+/sC#AgD7+wI#BAPv7Ag#IA+/wC#AgD7+wI#C//v7Ag#IA+/sC#AgD7+wI#CAPv7Ag#IA+/sC#AgD8+wI#CAPv7Ag#IA+/sC#Av/7+wE#CAPv7Ag#IA+/sC#AgD7/AI#CAPv7Ag#IA+/sC#AgD7+wI#CAPv7Ag#L/+/sC#AgD8+wI#CAPv7Ag#IA+/sC#AQD7+wI#CAPv7Ag#IA+/sC#AgD7+wI#C//v8Ag#IA+/sC#AgD7+wI#C/vr9Ag#L/+vwC#Av76/AI#C//v9Ag#L++vwC#Af/6/AI#C/vr9Ag#L/+/wC#Av76/AI#C//r8Ag#L++v0C#Av/6/AI#C/vv8Ag#L/+v0C#Av76/AI#C//r8Ag#L++v0B#Av/7/AI#C//r8Ag#L++v0C#Av/6/AI#C/vv8Ag#L/+vwC#Av76/QI#C//r8Ag#L++vwC#Av/7/QI#C/vr8Ag#H/+vwC#Av76/QI#C//v8Ag#L8+/0C#Avz7/wI#C/Pz+Ag#L7/P4C#Avz7/gI#C+/z+Ag#L8/P4C#Avv8/gI#C/Pv/AQ#L8/P4C#Avv8/gI#C/Pv+Ag#L7/P4C#Avz8/gI#C+/v/Ag#L8/P4C#Avz8/gI#C+/v+Ag#L8/P4C#Avv8/gI#C/Pz+AQ#L7+/8C#Avz8/gI#C/Pz+Ag#L7+/4C#Avz8/gI#C+/z+Ag#L8+/8C#Avv8/gI#C/Pz+Ag#L8/P4C#Avv7/gI#B/P7/Ag#L7//8C#Avv//wI#C/P//Ag#L7//8C#Avv//wI#C/P//Ag#L7//8C#Avv+/wI#C+///Ag#L8//8C#Avv//wE#C+///Ag#L8//8C#Avv//wI#C+///Ag#L8//8C#Avv+/wI#C+///Ag#L8//8C#Avv//wI#C+///Ag#L8//8C#Afv//wI#C+///Ag#L8//8C#Avv+/wI#C+///Ag#L8//8C#Avv//wI#C+///Ag#L8//8C#Avj+/wI#C+f4AAg#L4//8B#Avn+/wI#C+P7/Ag#L4/v8C#Avn+/wI#C+P7/Ag#L4/v8C#Avn//wI#C+P7/Ag#L4/v8C#Avn+/wI#C+P7/Ag#L5/v8B#Avj//wI#C+P7/Ag#L5/v8C#Avj+/wI#C+P7/Ag#L5/v8C#Avj+/wI#C+f//Ag#L4/v8C#Avj+/wI#C+f7/Ag#H4/v8C#Avj+/wI#C+f//Ag#L4/v8C#Avn+/wI#C+P7/Ag#==',
      [0.0, [1.0, 0.961, 0.941]]
    ),
  },
  [ColorSchemas.YellowToRed]: {
    id: ColorSchemas.YellowToRed,
    label: i18n.translate('charts.colormaps.yellowToRedText', {
      defaultMessage: 'Yellow to Red',
    }),
    value: decompress(
      'Ag#IA/vsC#AgD++gI#CAP37Ag#IA/voC#AgD++wI#BAP77Ag#IA/foC#AgD++wI#CAP76Ag#IA/vsC#AgD++gI#CAP37Ag#IA/vsC#AgD++gI#CAP77Ag#IA/voC#AgD9+wE#CAP77Ag#IA/voC#AgD++wI#CAP36Ag#IA/vsC#AgD++gI#CAP77Ag#IA/vsC#AgD9+gI#CAP77Ag#IA/voC#AgD++wE#CAP77Ag#IA/foC#AgD++wI#CAP77Ag#IA/foC#AgD++wI#C//37Ag#IA/vsC#AgD9+wI#CAP77Ag#IA/foC#AQD++wI#CAP37Ag#IA/vsC#AgD++wI#C//37Ag#IA/voC#AgD9+wI#CAP77Ag#IA/fsC#AgD++wI#CAP37Ag#IA/voB#Av/9+wI#CAP77Ag#IA/vsC#AgD9+wI#CAP77Ag#IA/foC#AgD++wI#CAP37Ag#L//vsC#AgD9+wI#CAP77Ag#EA/foC#AgD7+wI#CAPv7Ag#IA+/sC#AgD8+wI#CAPv7Ag#IA+/oC#AgD7+wI#CAPv7Ag#IA/PsC#AgD7+wI#CAPv7AQ#IA+/oC#AgD7+wI#CAPz7Ag#IA+/sC#AgD7+wI#CAPv7Ag#IA+/oC#AgD8+wI#CAPv7Ag#IA+/sC#AgD7+wI#CAPv7AQ#IA/PoC#AgD7+wI#CAPv7Ag#IA+/sC#AgD7+wI#CAPz7Ag#IA+/oC#AgD7+wI#CAPv8Ag#IA/P4C#AgD7/gI#BAPz+Ag#IA+/4C#Av/8/gI#CAPv+Ag#IA+/8C#AgD8/gI#CAPv+Ag#IA/P4C#AgD7/gI#CAPz+Ag#L/+/4C#AgD8/gE#CAPv+Ag#IA+/4C#AgD8/gI#CAPv+Ag#IA/P4C#AgD7/gI#C//z+Ag#IA+/4C#AgD8/gI#CAPv+Ag#IA/P4C#AQD7/gI#CAPv+Ag#IA/P4C#Av/7/gI#CAPz+Ag#IA+/4C#AgD6/gI#CAPj+Ag#IA+f4C#AgD4/gI#CAPj9Ag#L/+P4C#AQD5/gI#CAPj+Ag#IA+P0C#AgD4/gI#CAPn+Ag#IA+P4C#AgD4/gI#C//j9Ag#IA+f4C#AgD4/gI#CAPj+Ag#IA+P4B#AgD5/QI#CAPj+Ag#IA+P4C#AgD4/gI#C//n9Ag#IA+P4C#AgD4/gI#CAPj+Ag#IA+f4C#AgD4/QI#CAPj+Ag#EA+P4C#Av/5/gI#CAPj+Ag#L++f4C#Av35/gI#C/fr+Ag#L9+v4C#Av35/wI#C/fr+Ag#L9+f4C#Av36/wI#C/fr+AQ#L9+f4C#Av36/gI#C/Pr/Ag#L9+f4C#Av36/gI#C/fn/Ag#L9+v4C#Av36/gI#C/fn+Ag#L9+v8C#Av35/gI#C/fr+AQ#L9+v4C#Av35/wI#C/fr+Ag#L8+f4C#Av36/wI#C/fr+Ag#L9+f4C#Av36/gI#C/fn/Ag#L9+v4C#Av36/gI#B/PwBAg#L7/AEC#Avv9AQI#C/P0BAg#L7/QIC#Avv9AQI#C/PwBAg#L7/QEC#Avv9AgI#C/P0BAg#L7/QEC#Avv8AQE#C/P0BAg#L7/QIC#Avv9AQI#C/P0BAg#L7/AEC#Avv9AgI#C/P0BAg#L7/QEC#Avv9AQI#C/PwCAg#L7/QEC#Afv9AQI#C+/0BAg#L8/QEC#Avv8AgI#C+/0BAg#L8/QEC#Avv9AQI#C+/0CAg#L8/AEC#AvkAAAI#C+#g#L5AAAB#AvgAAAI#C+QAAAg#L4AAAC#AvkAAAI#C+#g#L5AAAC#AvgAAAI#C+QAAAg#L4AAAC#AvkAAAI#C+#g#L5AAAB#AvgAAAI#C+QAAAg#L4AAAC#AvkAAAI#C+#g#L5AAAC#AvgAAAI#C+QAAAg#L4AAAC#AvgAAAI#C+QAAAg#H4AAAC#AvkAAAI#C+#g#L5AAAC#AvgAAAI#C+QAAAg#==',
      [0.0, [1.0, 1.0, 0.8]]
    ),
  },

  [ColorSchemas.GreenToRed]: {
    id: ColorSchemas.GreenToRed,
    label: i18n.translate('charts.colormaps.greenToRedText', {
      defaultMessage: 'Green to Red',
    }),
    value: decompress(
      'Ag#IEBwQC#AgQIAwI#CBAcEAg#IEBwQC#AgQIBAI#BBAcEAg#IECAQC#AgQHAwI#CBAcEAg#IECAQC#AgQHBAI#CBAcEAg#IECAQC#AgQHBAI#CBAgDAg#IEBwQC#AgQHBAE#CBAgEAg#IEBwQC#AgQHBAI#CBAgDAg#IEBwQC#AgQIBAI#CBAcEAg#IEBwQC#AggHAwI#CCwYDAg#IMBQMC#AgwGAwE#CDAYDAg#ILBQMC#AgwGAwI#CDAYDAg#ILBQMC#AgwGAgI#CDAYDAg#ILBgMC#AgwFAwI#CDAYDAg#ILBgMC#AQwFAwI#CDAYDAg#ILBgMC#AgwFAwI#CDAYDAg#IMBgMC#AgsFAwI#CDAYCAg#IMBgMC#AgsFAwI#CDAYDAg#IKBAEB#AgoFAQI#CCgQBAg#IJBAIC#AgoFAQI#CCgQBAg#IKBAEC#AgoFAQI#CCgQBAg#IJBAEC#AgoFAQI#CCgQBAg#EKBAEC#AgoEAQI#CCgUBAg#IJBAEC#AgoEAgI#CCgUBAg#IKBAEC#AgoEAQI#CCgUBAg#IKBAEC#AgkEAQI#CCgUBAQ#IKBAEC#AgkEAwI#CCAMFAg#IIAwUC#AgcEBQI#CCAMGAg#IIBAUC#AggDBQI#CCAMFAg#IIBAUC#AgcDBQI#CCAQFAQ#IIAwUC#AggDBQI#CCAQFAg#IIAwUC#AggDBQI#CBwQFAg#IIAwUC#AggEBgI#CCAMFAg#IIAwUC#AggEBQI#BBwMFAg#IIAwUC#AggEBQI#CCAMFAg#IGAwgC#AgYCCAI#CBgMIAg#IFAggC#AgYDCAI#CBgIIAg#IGAggC#AgYDCAE#CBgIIAg#IFAwgC#AgYCCAI#CBgMIAg#IGAggC#AgYDCAI#CBgIIAg#IFAwgC#AgYCCAI#CBgMIAg#IGAggC#AQYCCAI#CBgMIAg#IGAggC#AgUDCAI#CBgIIAg#IGAwgC#AgP/AAI#CAPv4Ag#IA+/gC#Av/7+AI#CAPz4Ag#IA+/gC#AQD7+AI#CAPv4Ag#IA+/gC#AgD8+AI#C//v4Ag#IA+/gC#AgD7+AI#CAPz4Ag#IA+/gC#AgD7+AI#C//v4Ag#IA/PgB#AgD7+AI#CAPv4Ag#IA+/gC#AgD8+AI#CAPv4Ag#L/+/gC#AgD7+AI#CAPv4Ag#IA+foC#AgD4+QI#CAPj6Ag#H/+fkC#AgD4+gI#CAPj5Ag#IA+foC#AgD4+QI#CAPj6Ag#IA+foC#Av/4+QI#CAPj6Ag#IA+PkC#AgD5+gI#CAPj5AQ#IA+PoC#Av/5+QI#CAPj6Ag#IA+PkC#AgD5+gI#CAPj5Ag#IA+PoC#AgD5+gI#C//j5Ag#IA+PoC#Av/3+gI#C//b7AQ#L/9vwC#Av72+wI#C//b8Ag#L/9vsC#Av72+wI#C//b8Ag#L+9vsC#Av/2/AI#C//b7Ag#L+9vsC#Av/2/AI#B/vb7Ag#L/9vsC#Av/2/AI#C/vb7Ag#L/9vwC#Av/2+wI#C/vb7Ag#L/9vwC#Av72+wI#C//b8Ag#L/9vsC#Av72+wE#C//b8Ag#L79/sC#Avz3/AI#C+/b8Ag#L89/wC#Avz3+wI#C+/b8Ag#L89/wC#Avv2+wI#C/Pf8Ag#L79/wC#Afz2+wI#C+/f8Ag#L89vwC#Avv3+wI#C/Pf8Ag#L89vwC#Avv3/AI#C/Pf7Ag#L79vwC#Avz3/AI#C+/b7Ag#L89/wB#Avv3/AI#C/Pb7Ag#L79/wC#Avr4/gI#C+fgAAg#L4+QAC#Avj4/wI#C+fkAAg#L4+QAC#Avj4AAI#C+PkAAg#L5+AAB#Avj5/wI#C+PkAAg#L5+AAC#Avj5AAI#C+PkAAg#L5+AAC#Avj5AAI#C+Pj/Ag#L5+QAC#Avj5AAI#C+PgAAg#H5+QAC#Avj5AAI#C+Pj/Ag#L4+QAC#Avn4AAI#C+PkAAg#==',
      [0, [0, 0.408, 0.216]]
    ),
  },
};

export const colorSchemas: ColorSchema[] = Object.values(vislibColorMaps).map(({ id, label }) => ({
  value: id,
  text: label,
}));
