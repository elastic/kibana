import { extendedTemplate } from './extended_template';
import './font.less';

export const font = () => ({
  name: 'font',
  displayName: 'Text Settings',
  help: 'Set the font, size and color',
  template: extendedTemplate,
  default: '{font size=12 family="\'Open Sans\', Helvetica, Arial, sans-serif" color="#000000" align=left}',
});
