import { extendedTemplate } from './extended_template';
import './font.less';

export const font = () => ({
  name: 'font',
  displayName: 'Text Settings',
  description: 'Set the font, size and color',
  template: extendedTemplate,
  defaultValue: '{font size=12 family="\'Open Sans\', Helvetica, Arial, sans-serif" color="#000000" align=left}',
  //simpleTemplate,
});
