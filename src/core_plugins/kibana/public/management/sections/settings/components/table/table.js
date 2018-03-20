import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';

import {
  EuiBasicTable,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiImage,
  EuiButtonIcon,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import {
  isDefaultValue
} from '../../lib';

export class Table extends PureComponent {
  static propTypes = {
    items: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      editingSettingName: null,
      editingSetting: null,
    };
  }

  renderNameAndDescription(item) {
    const defaultVal = isDefaultValue(item) ? '' : (
      <Fragment>
        <EuiTextColor color="subdued">
          Default: <em>{item.defVal === undefined || item.defVal === null || item.defVal === '' ? 'null' : item.defVal}</em>
        </EuiTextColor>
        <EuiSpacer size="xs" />
      </Fragment>
    );

    const isCustom = item.isCustom ? (
      <Fragment>
        <EuiTextColor color="subdued">
          (Custom Setting)
        </EuiTextColor>
        <EuiSpacer size="xs" />
      </Fragment>
    ) : '';

    return (
      <Fragment>
        <EuiText size="s">
          <div>
            <h3>{item.name}</h3>
            {defaultVal}
            {isCustom}
            <span dangerouslySetInnerHTML={{ __html: item.description }} />
          </div>
        </EuiText>
      </Fragment>
    );
  }

  renderActions(item) {
    if(this.state.editingSettingName === item.name) {
      return (
        <Fragment>
          <EuiButtonIcon
            size="s"
            onClick={() => {
              //some save action here
              this.stopEditingSetting();
            }}
            iconType="checkInCircleFilled"
            aria-label="Save"
          />
          <EuiButtonIcon
            size="s"
            onClick={() => {
              this.stopEditingSetting();
            }}
            iconType="cross"
            aria-label="Cancel"
          />
        </Fragment>
      );
    }

    return (
      <Fragment>
        {isDefaultValue(item) ? '' : (
          <EuiButtonIcon
            size="s"
            color="danger"
            onClick={() =>
              console.log('something')
            }
            iconType="trash"
            aria-label="Clear"
          />
        )}

        <EuiButtonIcon
          size="s"
          onClick={() =>
            this.startEditingSetting(item.name, item)
          }
          iconType="pencil"
          aria-label="Edit"
        />
      </Fragment>
    )
  }

  renderValue(item) {
    return (
      <EuiText className="advancedSettings__table__value">
        <span>
          {this.getValue(item)}
        </span>
      </EuiText>
    );
  }

  getValue(item) {
    if(item.normal || item.json || item.select) {
      return item.value || item.defVal;
    }

    if(item.array) {
      return (item.value || item.defVal).join(', ');
    }

    if(item.bool) {
      return item.value === undefined ? item.defVal : item.value.toString();
    }

    if(item.markdown) {
      return (
        <ReactMarkdown source={item.value} />
      );
    }

    if(item.image && item.value) {
      return (
        <EuiImage url={item.value} />
      );
    }

    return item.value;
  }

  renderEditValue(item) {
    return (
      <div>
        `edit field` for {item.name}
      </div>
    );
  }

  startEditingSetting(name, item) {
    this.setState({
      editingSettingName: name,
      editingSetting: { ...item },
    });
  }

  stopEditingSetting() {
    this.setState({
      editingSettingName: null,
      editingSetting: null,
    });
  }

  render() {
    const { items } = this.props;

    const columns = [
      {
        field: 'name',
        name: 'Name',
        dataType: 'string',
        render: (value, item) => this.renderNameAndDescription(item),
      },
      {
        field: 'value',
        name: 'Value',
        dataType: 'string',
        render: (value, item) => this.state.editingSettingName === item.name ? this.renderEditValue(item) : this.renderValue(item),
      },
      {
        name: '',
        align: RIGHT_ALIGNMENT,
        width: '100',
        render: item => this.renderActions(item),
      },
    ];

    return (
      <EuiBasicTable
        className="advancedSettings__table"
        items={items}
        columns={columns}
      />
    );
  }
}
