import React from 'react';

import { CirclePicker } from 'react-color';

export default ({color, colors, onChange}) => {
  /*
  colors = colors || [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b',
    '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000',
  ];
  */

  colors = colors || [
    '#37988d', '#c19628', '#b83c6f', '#3f9939', '#1785b0', '#ca5f35',
    '#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643',
    '#72cec3', '#f5cc5d', '#ec77a8', '#7acf74', '#4cbce4', '#fd986f',
    '#a1ded7', '#f8dd91', '#f2a4c5', '#a6dfa2', '#86d2ed', '#fdba9f',
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  ];


  return (
    <CirclePicker width='190px' color={color} colors={colors} circleSize={24} circleSpacing={6} onChange={onChange}/>
  );

};
