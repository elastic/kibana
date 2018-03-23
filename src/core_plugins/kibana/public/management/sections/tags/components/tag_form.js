import React from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { DuplicateTitleError } from  'ui/saved_objects';
import {
  EuiColorPicker,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,

} from '@elastic/eui';

const MAX_TITLE_LENGTH = 50;

export class TagForm extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      title: props.tagSavedObject.attributes.title,
      color: props.tagSavedObject.attributes.color,
      isTitleValid: true,
    };
  }

  handleTitleChange = (evt) => {
    this.setState({
      title: evt.target.value,
    }, this.validateTitle);
  }

  handleColorChange = (newColor) => {
    this.setState({
      color: newColor,
    });
  }

  validateTitle = () => {
    if (!this.state.title) {
      this.setState({
        isTitleValid: false,
        titleError: 'Required'
      });
      return false;
    } else if (!this.state.title.length > 50) {
      this.setState({
        isTitleValid: false,
        titleError: `'${this.state.title}'' is longer than ${MAX_TITLE_LENGTH} characters`
      });
      return false;
    }

    this.setState({
      isTitleValid: true,
      titleError: undefined
    });
    return true;
  }

  handleSaveClick = async () => {
    const isTitleValid = this.validateTitle();
    if (!isTitleValid) {
      return;
    }

    try {
      const attributes = {
        title: this.state.title,
        color: this.state.color
      };
      await this.props.save(attributes, this.props.tagSavedObject.id, this.props.tagSavedObject._version);
    } catch (e) {
      if (e instanceof DuplicateTitleError) {
        this.setState({
          isTitleValid: false,
          titleError: `A tag with the title '${this.state.title}' already exists.`
        });
      } else {
        toastNotifications.addDanger({
          title: `Unable to save  tag`,
          text: `${e}`,
        });
      }
      return;
    }

    toastNotifications.addSuccess(`Tag '${this.state.title}' was saved`);
    this.props.onSuccessfulSave();
  }

  render() {
    return (
      <EuiForm
        style={{ width: '300px' }}
      >
        <EuiFormRow
          id="title"
          label="Title"
          helpText={`Must be less than ${MAX_TITLE_LENGTH} characters`}
          isInvalid={!this.state.isTitleValid}
          error={this.state.titleError}
        >
          <EuiFieldText
            value={this.state.title}
            onChange={this.handleTitleChange}
            isInvalid={!this.state.isTitleValid}
          />
        </EuiFormRow>

        <EuiFormRow
          id="color"
          label="Color"
        >
          <EuiColorPicker
            onChange={this.handleColorChange}
            color={this.state.color}
          />
        </EuiFormRow>

        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={this.props.onCancel}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={this.handleSaveClick}
              size="s"
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    );
  }
}

TagForm.propTypes = {
  tagSavedObject: PropTypes.object,
  savedObjectId: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
  onSuccessfulSave: PropTypes.func.isRequired,
};

TagForm.defaultProps = {
  tagSavedObject: {
    attributes: {
      color: '#E8488B',
      title: '',
    }
  }
};
