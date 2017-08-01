import { Element } from '../element';
import ReactDOM from 'react-dom';
import React from 'react';
import header from './header.png';
import { min, max, get } from 'lodash';
import chroma from 'chroma-js';
import './grid.less';

export default new Element('grid', {
  displayName: 'Grid',
  description: 'A colorable, sizable, grid for displaying a point series',
  image: header,
  expression: 'demodata().pointseries(x="project", y="state", size="median(price)").grid().render()',
  render(domNode, config, done) {

    const { summary, columns, rows } = config;

    const nominalPalette = ['#01A4A4', '#CC6666', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060'];
    const ordinalPalette = ['#ACF0F2', '#1695A3', '#225378'];

    // TODO: This should be between 0.5 and 1.5, or something, currently between 0 and 1, 0 is bad.
    let getSize; // This should always return a number between 0 and 1, whether for dimensions or metrics
    switch (get(summary.size, 'role')) {
      case 'measure':
        const extents = {
          min: min(summary.size.values),
          max: max(summary.size.values),
        };
        getSize = (val) => {
          return ((1 / (extents.max - extents.min) * (val - extents.min)) + 0.1) * 2;
        };
        break;
      case 'dimension':
        getSize = (size) => ((summary.size.values.indexOf(size) + 1) / summary.size.values.length + 0.1) * 2;
        break;
      default:
        getSize = () => 1;
    }

    let getColor; // This should always return a number between 0 and 1, whether for dimensions or metrics
    switch (get(summary.color, 'role')) {
      case 'measure':
        getColor = (val) => {
          const gradient = chroma.scale(ordinalPalette)
            .domain([0, summary.color.values.length - 1]);
          return gradient(summary.color.values.indexOf(val));
        };
        break;
      case 'dimension':
        getColor = (val) => {
          return nominalPalette[summary.color.values.indexOf(val) % nominalPalette.length];
        };
        break;
      default:
        getColor = () => null;
    }

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
                      <span key={k} style={{ fontSize: `${getSize(val.size)}em`, color: getColor(val.color) }}>
                        {
                          val.text == null ? <i className="fa fa-circle"/> : val.text
                        } &nbsp;
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

    ReactDOM.render(table, domNode);
    done();
  },
});
