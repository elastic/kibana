import header from './header.png';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown Filter',
  help:
    'Extract values from a datatable and populate a dropdown for use in filtering rows for a column with the selected value',
  image: header,
  expression: 'demodata | dropdownControl valueColumn=project filterColumn=project',
  filter: '',
});
