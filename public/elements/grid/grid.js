import React from 'react';
import ReactDOM from 'react-dom';
import { min, max, get } from 'lodash';
import chroma from 'chroma-js';
import header from './header.png';
import './grid.less';
import $ from 'jquery';

// TODO: This should be between 0.5 and 1.5, or something, currently between 0 and 1, 0 is bad.
// This should always return a number between 0 and 1, whether for dimensions or metrics
function getSize(summary, val) {
  const { size } = val;
  const role = get(summary.size, 'role');

  if (role === 'measure') {
    const extents = {
      min: min(summary.size.values),
      max: max(summary.size.values),
    };
    return ((1 / (extents.max - extents.min) * (size - extents.min)) + 0.1) * 2;
  }

  if (role === 'dimension') {
    return ((summary.size.values.indexOf(size) + 1) / summary.size.values.length + 0.1) * 2;
  }

  return 1;
}

// This should always return a number between 0 and 1, whether for dimensions or metrics
function getColor(palette, summary, val) {
  const { color, style } = val;
  const role = get(summary.color, 'role');
  const styleColor = get(style, 'color');

  if (styleColor) return styleColor;

  if (role === 'measure' || palette.gradient) {
    const gradient = chroma.scale(palette.colors).domain([0, summary.color.values.length - 1]);
    return gradient(summary.color.values.indexOf(color));
  }

  if (role === 'dimension') {
    return palette.colors[summary.color.values.indexOf(color) % palette.colors.length];
  }

  return null;
}

export default {
  name: 'grid',
  displayName: 'Grid',
  description: 'A colorable, sizable, grid for displaying a point series',
  image: header,
  expression: 'filters | demodata | pointseries x="project" y="state" size="median(price)" | grid | render',
  render(domNode, config, handlers) {
    const { mark, summary, columns, rows, palette, font } = config;

    const table = (
      <div style={{ height: '100%', overflow: 'auto' }} className="canvas__element--grid">
        <table>
          {!summary.y && !summary.x ? null : (
            <thead>
              <tr>
                {!summary.y ? null :
                  <th>{summary.y.expression}</th>
                }
                {columns.map(col => (
                  <th key={`header-${col}`} className="canvas__element--grid-label">{col}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key=  {`row-${i}`}>
                {row.label == null ? null : (
                  <td className="canvas__element--grid-label">{row.label}</td>
                )}

                {row.cells.map((col, j) => (
                  <td key={`row-${i}-${j}`}>
                    {col.map((val, k) => (
                      <div
                        key={k}
                        className="canvas__element--grid-block"
                        style={{
                          fontSize: `${getSize(summary, val)}em`,
                          color: getColor(palette, summary, val),
                        }}
                      >
                        { (!mark && !val.text) &&  <i className={`fa fa-circle`}/>}
                        { mark && <i className={`fa fa-${mark}`}/> }
                        { val.text && <div className="canvas__element--grid--series-label">{val.text}</div> }
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/*<pre>
          {JSON.stringify(config, null, ' ')}
        </pre>*/}
      </div>
    );

    ReactDOM.render(table, domNode, () => {
      $('td, th', domNode).css(font.spec);
    });
    handlers.done();
  },
};
