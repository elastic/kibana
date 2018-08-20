import { openSans } from '../../../common/lib/fonts';

export const metric = () => ({
  name: 'metric',
  displayName: 'Metric',
  modelArgs: [['_', { label: 'Number' }]],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: 'Label',
      help: 'Describes the metric',
      argType: 'string',
      default: '""',
    },
    {
      name: 'metricFont',
      displayName: 'Metric Text Settings',
      help: 'Fonts, alignment and color',
      argType: 'font',
      default: `{font size=48 family="${openSans.value}" color="#000000" align=center lHeight=48}`,
    },
    {
      name: 'labelFont',
      displayName: 'Label Text Settings',
      help: 'Fonts, alignment and color',
      argType: 'font',
      default: `{font size=18 family="${openSans.value}" color="#000000" align=center}`,
    },
  ],
});
