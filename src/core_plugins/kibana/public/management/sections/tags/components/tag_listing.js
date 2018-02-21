import React from 'react';
import PropTypes from 'prop-types';
import { TagForm } from './tag_form';

import {
  EuiTitle,
  EuiTableOfRecords,
  EuiPage,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiButton,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';

export class TagListing extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      showCreate: false,
      showDeleteModal: false,
      tags: []
    };
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    this.fetchTags();
  }

  fetchTags() {

  }

  onCreateBtnClick = () => {
    this.setState({
      showCreate: !this.state.showCreate,
    });
  }

  closeCreate = () => {
    this.setState({
      showCreate: false,
    });
  }

  closeDeleteModal = () => {
    this.setState({ showDeleteModal: false });
  }

  openDeleteModal = () => {
    this.setState({ showDeleteModal: true });
  }

  deleteSelectedItems = async () => {
    try {
      await this.props.delete(this.state.selectedIds);
    } catch (error) {
      toastNotifications.addWarning({
        title: `Unable to delete tag(s)`,
        text: `${error}`,
      });
    }
    this.fetchTags();
    this.setState({
      selectedIds: []
    });
    this.closeDeleteModal();
  }

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Delete selected tags?"
          onCancel={this.closeDeleteModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
        >
          <p>{`You can't recover deleted tags.`}</p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  renderTable() {
    return (
      <div>Table placeholder</div>
    );
  }

  render() {
    return (
      <EuiPage>

        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                Tag management
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="createTag"
              ownFocus
              button={(
                <EuiButton onClick={this.onCreateBtnClick}>
                  Create tag
                </EuiButton>
              )}
              isOpen={this.state.showCreate}
              closePopover={this.closeCreate}
              anchorPosition="downRight"
              withTitle
            >
              <EuiPopoverTitle>Create tag</EuiPopoverTitle>
              <TagForm
                onCancel={this.closeCreate}
                save={this.props.save}
                onSuccessfulSave={this.closeCreate}
              />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        {this.renderTable()}

      </EuiPage>

    );
  }
}

TagListing.propTypes = {
  save: PropTypes.func.isRequired,
  delete: PropTypes.func.isRequired,
  find: PropTypes.func.isRequired,
};


