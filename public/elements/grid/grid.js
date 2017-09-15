import React from 'react';
import ReactDOM from 'react-dom';
import { min, max, get } from 'lodash';
import chroma from 'chroma-js';
import header from './header.png';
import { Element } from '../element';
import './grid.less';
import $ from 'jquery';

const ordinalPalette = ['#ACF0F2', '#1695A3', '#225378'];
const nominalPalette = [
  '#01A4A4',
  '#CC6666',
  '#D0D102',
  '#616161',
  '#00A1CB',
  '#32742C',
  '#F18D05',
  '#113F8C',
  '#61AE24',
  '#D70060',
];

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
function getColor(summary, val) {
  const { color, style } = val;
  const role = get(summary.color, 'role');
  const styleColor = get(style, 'color');

  if (styleColor) return styleColor;

  if (role === 'measure') {
    const gradient = chroma.scale(ordinalPalette).domain([0, summary.color.values.length - 1]);
    return gradient(summary.color.values.indexOf(color));
  }

  if (role === 'dimension') {
    return nominalPalette[summary.color.values.indexOf(color) % nominalPalette.length];
  }

  return null;
}

export default new Element('grid', {
  displayName: 'Grid',
  description: 'A colorable, sizable, grid for displaying a point series',
  image: header,
  expression: 'filters | demodata | pointseries x="project" y="state" size="median(price)" | grid | render',
  render(domNode, config, handlers) {
    const { mark, summary, columns, rows, font } = config;

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
                      <span
                        key={k}
                        style={{
                          fontSize: `${getSize(summary, val)}em`,
                          color: getColor(summary, val),
                        }}
                      >
                        {val.text == null ? <i className={`fa fa-${mark}`}/> : val.text} &nbsp;
                      </span>
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
});
