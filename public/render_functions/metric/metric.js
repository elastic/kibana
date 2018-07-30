import React from 'react';
import ReactDOM from 'react-dom';

export const metric = () => ({
  name: 'metric',
  displayName: 'Metric',
  help: 'Render HTML Markup for the Metric element',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const metricFontStyle = config.metricFont ? config.metricFont.spec : {};
    const labelFontStyle = config.labelFont ? config.labelFont.spec : {};

    ReactDOM.render(
      <div className="canvasMetric">
        <div className="canvasMetric__metric" style={metricFontStyle}>
          {config.metric}
        </div>
        <div className="canvasMetric__label" style={labelFontStyle}>
          {config.label}
        </div>
      </div>,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
