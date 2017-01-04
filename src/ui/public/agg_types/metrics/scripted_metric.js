import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import textHtml from 'ui/agg_types/controls/text.html';

export default function AggTypesMetricsScriptedMetricProvider(Private) {
  let MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  let fieldFormats = Private(RegistryFieldFormatsProvider);

  const buildScriptParam = function (scriptName) {
    return {
      name: scriptName,
      type: 'string',
      editor: textHtml,
      write:function (aggConfig, output) {
        const inlineScript = aggConfig.params[scriptName];
        if (!inlineScript) {
          return;
        }

        output.params[scriptName] = {
          lang: aggConfig.params.lang,
          inline: inlineScript
        };
      }
    };
  };

  return new MetricAggType({
    name: 'scripted_metric',
    title: 'Scripted Metric',
    makeLabel: function () {
      return 'Scripted Metric';
    },
    getFormat: function () {
      return fieldFormats.getDefaultInstance('number');
    },
    params: [
      {
        name: 'lang',
        type: 'script_lang',
        write: function () {}
      },
      buildScriptParam('init_script'),
      buildScriptParam('map_script'),
      buildScriptParam('combine_script'),
      buildScriptParam('reduce_script')
    ]
  });
};
