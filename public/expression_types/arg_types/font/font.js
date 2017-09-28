import { ArgType } from '../../arg_type';
//import { simpleTemplate } from './simple_template';
import { extendedTemplate } from './extended_template';
import './font.less';

export const font = () => new ArgType('font', {
  displayName: 'Text Settings',
  description: 'Set the font, size and color',
  template: extendedTemplate,
  defaultValue: '{font size=12 family="\'Open Sans\', Helvetica, Arial, sans-serif" color="#000000" align=left}',
  //simpleTemplate,
});
