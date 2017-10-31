import header from './header.png';

export const pie = {
  name: 'pie',
  displayName: 'Pie chart',
  help: 'An customizable element for making pie charts from your data',
  image: header,
  expression: 'filters | demodata | pointseries color="state" size="max(price)" | pie | render',
};
