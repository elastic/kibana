import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

export class FieldFormatEditor extends PureComponent {
  static propTypes = {
    fieldFormat: PropTypes.object.isRequired,
    fieldFormatId: PropTypes.string.isRequired,
    fieldFormatParams: PropTypes.object.isRequired,
    fieldFormatEditors: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      EditorComponent: null,
    };
  }

  static getDerivedStateFromProps(nextProps) {
    return {
      EditorComponent: nextProps.fieldFormatEditors.getEditor(nextProps.fieldFormatId) || null,
    };
  }

  onFormatParamsChange = (newParams, hasError) => {
    const { onChange } = this.props;
    onChange(newParams, hasError);
  }

  render() {
    const { EditorComponent } = this.state;
    const { fieldFormat, fieldFormatParams } = this.props;

    return (
      <Fragment>
        { EditorComponent ? (
          <EditorComponent
            format={fieldFormat}
            formatParams={fieldFormatParams}
            onChange={this.onFormatParamsChange}
          />
        ) : null}
      </Fragment>
    );
  }
}
