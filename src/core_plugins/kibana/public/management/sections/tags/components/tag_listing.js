import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { TagFormPopover } from './tag_form_popover';
import { toastNotifications } from 'ui/notify';

import {
  EuiTitle,
  EuiPage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiInMemoryTable,
  EuiBadge,
} from '@elastic/eui';

export class TagListing extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isFetchingItems: true,
      showDeleteModal: false,
      tags: [],
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

  fetchTags = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch);
  }

  debouncedFetch = _.debounce(async () => {
    const tags = await this.props.find('');

    if (!this._isMounted) {
      return;
    }

    this.setState({
      isFetchingItems: false,
      tags: tags.map((tag) => {
        // work around until EuiInMemoryTable.columns.field supports nested field names
        tag.title = tag.attributes.title;
        return tag;
      })
    });
  }, 300);

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

  renderTag = (field, item) => {
    console.log("render column");
    return (
      <TagFormPopover
        button={(
          <EuiBadge color={item.attributes.color}>
            {item.attributes.title}
          </EuiBadge>
        )}
        formTitle="Edit tag"
        tagSavedObject={item}
        save={this.props.save}
        onSuccessfulSave={this.fetchTags}
        anchorPosition="downLeft"
      />
    );
  }

  renderTable = () => {
    const selection = {
      itemId: (item) => {
        return item.id;
      }
    };
    const search = {
      box: {
        incremental: true
      }
    };
    return (
      <EuiInMemoryTable
        loading={this.state.isFetchingItems}
        items={this.state.tags}
        selection={selection}
        search={search}
        columns={[
          {
            field: 'title',
            name: 'Title',
            render: this.renderTag,
            sortable: true
          }
        ]}
        pagination={true}
        sorting={true}
      />
    );
  }

  render() {
    console.log("render called");
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
            <TagFormPopover
              button={(
                <EuiButton>
                  Create tag
                </EuiButton>
              )}
              formTitle="Create tag"
              save={this.props.save}
              onSuccessfulSave={this.fetchTags}
              anchorPosition="downRight"
            />
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


