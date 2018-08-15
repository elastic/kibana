import header from './header.png';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown Filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  image: header,
  height: 50,
  expression: `demodata
| dropdownControl valueColumn=project filterColumn=project | render`,
  filter: '',
});
