import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';
import './axis_config.less';

export const axisConfig = () => ({
  name: 'axisConfig',
  displayName: 'Axis Config',
  help: 'Visualization axis configuration',
  simpleTemplate: SimpleTemplate,
  template: ExtendedTemplate,
});
