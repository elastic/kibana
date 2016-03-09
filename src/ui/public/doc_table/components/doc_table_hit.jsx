import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import $ from 'jquery';
import addWordBreaks from 'ui/utils/add_word_breaks';
import noWhiteSpace from 'ui/utils/no_white_space';
import AngularDirective from './angular_directive';

// guesstimate at the minimum number of chars wide cells in the table should be
const MIN_LINE_LENGTH = 20;

export default class DocTableHit extends Component {
  static propTypes = {
    columns: PropTypes.arrayOf(PropTypes.string),
    indexPattern: PropTypes.shape({
      timeFieldName: PropTypes.string,
      formatField: PropTypes.func
    }),
    hit: PropTypes.object.isRequired,
    filter: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.state = {
      open: false
    };
  }

  getDocViewerHref() {
    const { indexPattern, hit } = this.props;
    const esc = window.encodeURIComponent;
    return `#/doc/${esc(indexPattern.id)}/${hit._index}/${hit._type}/?id=${esc(hit._id)}`;
  }

  toggle() {
    const { open } = this.state;
    this.setState({ open: !open });
  }

  renderValue({ column, breakWords = false }) {
    const { indexPattern, hit } = this.props;
    const text = indexPattern.formatField(hit, column);

    if (!breakWords) return text;

    const brokenText = addWordBreaks(text, MIN_LINE_LENGTH);
    if (text.length > MIN_LINE_LENGTH) {
      return `<div className="truncate-by-height">${brokenText}</div>`;
    } else {
      return brokenText;
    }
  }

  renderCell({ key, sourcefield = false, value }) {
    const attrs = {};
    if (key === 'timefield') {
      attrs.className = 'discover-table-timefield';
      attrs.width = '1%';
    } else if (sourcefield) {
      attrs.className = 'discover-table-sourcefield';
    } else {
      attrs.className = 'discover-table-datafield';
    }

    return (
      <td
        key={key}
        {...attrs}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  render() {
    const { open } = this.state;
    const { columns, indexPattern, filter, hit } = this.props;
    const openerArrow = open ? 'down' : 'right';
    const esc = window.encodeURIComponent;

    const cells = [
      <td key="toggle" onClick={() => this.toggle()}>
        <i className={`fa discover-table-open-icon fa-caret-${openerArrow}`} />
      </td>
    ];

    if (indexPattern.timeFieldName) {
      cells.push(this.renderCell({
        key: 'timefield',
        value: this.renderValue({ column: indexPattern.timeFieldName })
      }));
    }

    for (const column of columns) {
      cells.push(this.renderCell({
        key: `column:${column}`,
        sourcefield: (column === '_source'),
        value: this.renderValue({ column, breakWords: true })
      }));
    }

    return (
      <tbody>
        <tr>{cells}</tr>
        {
          open && <tr>
            <td colSpan={columns.length + 2}>
              <a className="pull-right" href={this.getDocViewerHref()}>
                <small>Link to /{`${hit._index}/${hit._type}/${ esc(hit._id) }`}</small>
              </a>
              <AngularDirective scope={{ hit, filter, columns, indexPattern }}>
                <doc-viewer hit="hit" filter="filter" columns="columns" index-pattern="indexPattern" />
              </AngularDirective>
            </td>
          </tr>
        }
      </tbody>
    );
  }
};
