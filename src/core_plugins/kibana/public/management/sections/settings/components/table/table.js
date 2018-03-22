import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import MarkdownIt from 'markdown-it';

import {
  EuiInMemoryTable,
  EuiFieldText,
  EuiTextArea,
  EuiSwitch,
  EuiSelect,
  EuiFilePicker,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiImage,
  EuiButtonIcon,
  keyCodes,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import {
  isDefaultValue
} from '../../lib';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

export class Table extends PureComponent {
  static propTypes = {
    items: PropTypes.array.isRequired,
    save: PropTypes.func.isRequired,
    clear: PropTypes.func.isRequired,
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
              this.saveSetting(this.state.editingSettingName, this.state.editingSetting.unsavedValue);
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
    );
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
    switch(item.editor) {
      case 'array':
        return (item.value || item.defVal).join(', ');
      case 'boolean':
        return item.value === undefined ? item.defVal : item.value.toString();
      case 'markdown':
        return (
          <div dangerouslySetInnerHTML={{ __html: markdownIt.render(item.value) }} />
        );
      case 'image':
        return item.value ? (
          <EuiImage
            size="s"
            url={item.value}
            alt={item.name}
          />
        ) : '';
      default:
        return item.value || item.defVal;
    }
  }

  renderEditValue(item) {
    switch(item.editor) {
      case 'array':
        return (
          <EuiFieldText
            autoFocus
            defaultValue={item.unsavedValue}
            onChange={this.onEditingSettingChange}
            onKeyDown={this.onEditingSettingKeyDown}
          />
        );
      case 'boolean':
        return (
          <EuiSwitch
            checked={item.unsavedValue}
            onChange={this.onEditingSettingChange}
          />
        );
      case 'markdown':
      case 'json':
        return (
          <EuiTextArea
            defaultValue={item.unsavedValue}
            onChange={this.onEditingSettingChange}
            onKeyDown={this.onEditingSettingTextareaKeyDown}
          />
        );
      case 'image':
        return (
          <EuiFilePicker />
        );
      case 'select':
        return (
          <EuiSelect
            defaultValue={item.unsavedValue}
            options={item.options.map((text) => {
              return { text, value: text };
            })}
            onChange={this.onEditingSettingChange}
          />
        );
      default:
        return (
          <EuiFieldText
            autoFocus
            defaultValue={item.unsavedValue}
            onChange={this.onEditingSettingChange}
            onKeyDown={this.onEditingSettingKeyDown}
          />
        );
    };
  }

  startEditingSetting(name, item) {
    let unsavedValue = item.value == null ? item.defVal : item.value;

    if(item.array) {
      unsavedValue = unsavedValue.join(', ');
    }

    this.setState({
      editingSettingName: name,
      editingSetting: {
        ...item,
        unsavedValue,
      },
    });
  }

  stopEditingSetting() {
    this.setState({
      editingSettingName: null,
      editingSetting: null,
    });
  }

  onEditingSettingChange = (e) => {
    this.setState({
      editingSetting: {
        ...this.state.editingSetting,
        unsavedValue: e.target.value,
      }
    });
  };

  onEditingSettingKeyDown = ({ keyCode }) => {
    if (keyCodes.ENTER === keyCode) {
      this.saveSetting(this.state.editingSettingName, this.state.editingSetting.unsavedValue);
      this.stopEditingSetting();
    }
    if (keyCodes.ESCAPE === keyCode) {
      this.stopEditingSetting();
    }
  };

  onEditingSettingTextareaKeyDown = ({ keyCode }) => {
    if (keyCodes.ESCAPE === keyCode) {
      this.stopEditingSetting();
    }
  };

  saveSetting(name, value) {

    // if (conf.type === 'json' && conf.unsavedValue === '') {
    //   conf.unsavedValue = '{}';
    // }
    //
    // loading(conf, function () {
    //   if (conf.unsavedValue === conf.defVal) {
    //     return config.remove(conf.name);
    //   }
    //
    //   return config.set(conf.name, conf.unsavedValue);
    // });
    console.log('jen will save: ', name, value);
    this.props.save(name, value);
  }

  clearSetting(name) {
    console.log('jen will clear: ', name);
    this.props.clear(name);
  }

  render() {
    const { items } = this.props;

    const columns = [
      {
        field: 'name',
        name: 'Name',
        dataType: 'string',
        render: (value, item) => this.renderNameAndDescription(item),
        sortable: true,
      },
      {
        field: 'value',
        name: 'Value',
        dataType: 'string',
        render: (value, item) => {
          return this.state.editingSettingName === item.name ? this.renderEditValue(this.state.editingSetting) : this.renderValue(item);
        }
      },
      {
        name: '',
        align: RIGHT_ALIGNMENT,
        width: '100',
        render: item => this.renderActions(item),
      },
    ];

    const search = {
      box: {
        incremental: true
      }
    };

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      }
    };

    return (
      <EuiInMemoryTable
        className="advancedSettings__table"
        search={search}
        items={items}
        columns={columns}
        sorting={sorting}
        pagination={false}
      />
    );
  }
}
