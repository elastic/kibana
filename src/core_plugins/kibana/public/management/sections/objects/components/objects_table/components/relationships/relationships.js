import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiLink,
  EuiIcon,
  EuiCallOut,
  EuiLoadingKibana,
} from '@elastic/eui';
import { getSavedObjectIcon } from '../../../../lib/get_saved_object_icon';
import { getInAppUrl } from '../../../../lib/get_in_app_url';

export class Relationships extends Component {
  static propTypes = {
    getRelationships: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      relationships: undefined,
      isLoading: false,
      error: undefined,
    };
  }

  componentWillMount() {
    this.getRelationships();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.id !== this.props.id) {
      this.getRelationships();
    }
  }

  async getRelationships() {
    const { id, type, getRelationships } = this.props;

    this.setState({ isLoading: true });

    try {
      const relationships = await getRelationships(type, id);
      this.setState({ relationships, isLoading: false, error: undefined });
    } catch (err) {
      this.setState({ error: err.message, isLoading: false });
    }
  }

  renderError() {
    const { error } = this.state;

    if (!error) {
      return null;
    }

    return (
      <EuiCallOut title="Error" color="danger">
        {error}
      </EuiCallOut>
    );
  }

  renderRelationships() {
    const { relationships, isLoading, error } = this.state;

    if (error) {
      return this.renderError();
    }

    if (isLoading) {
      return <EuiLoadingKibana size="xl" />;
    }

    const items = [];

    for (const [type, list] of Object.entries(relationships)) {
      if (list.length === 0) {
        items.push(
          <EuiDescriptionListTitle>No {type} found.</EuiDescriptionListTitle>
        );
      } else {
        let node;

        switch (this.props.type) {
          case 'dashboard':
            node = (
              <p>
                Here are some visualizations used on this dashboard. You can
                safely delete this dashboard and the visualizations will still
                work properly.
              </p>
            );
            break;
          case 'search':
            if (type === 'visualizations') {
              node = (
                <EuiCallOut title="Warning" color="warning">
                  <p>
                    Here are some visualizations that use this saved search. If
                    you delete this saved search, these visualizations will not
                    longer work properly.
                  </p>
                </EuiCallOut>
              );
            } else {
              node = (
                <p>Here is the index pattern tied to this saved search.</p>
              );
            }
            break;
          case 'visualization':
            node = (
              <EuiCallOut title="Warning" color="warning">
                <p>
                  Here are some dashboards which contain this visualization. If
                  you delete this visualization, these dashboards will no longer
                  show them.
                </p>
              </EuiCallOut>
            );
            break;
          case 'index-pattern':
            if (type === 'visualizations') {
              node = (
                <EuiCallOut title="Warning" color="warning">
                  <p>
                    Here are some visualizations that use this index pattern. If
                    you delete this index pattern, these visualizations will not
                    longer work properly.
                  </p>
                </EuiCallOut>
              );
            } else if (type === 'searches') {
              node = (
                <EuiCallOut title="Warning" color="warning">
                  <p>
                    Here are some saved searches that use this index pattern. If
                    you delete this index pattern, these saved searches will not
                    longer work properly.
                  </p>
                </EuiCallOut>
              );
            }
            break;
        }

        items.push(
          <Fragment key={type}>
            <EuiDescriptionListTitle style={{ marginBottom: '1rem' }}>
              {node}
            </EuiDescriptionListTitle>
            <Fragment>
              {list.map(item => (
                <EuiDescriptionListDescription key={item.id}>
                  <EuiLink href={`#${getInAppUrl(item.id, type)}`}>
                    <EuiIcon size="s" type={getSavedObjectIcon(type)} />
                    &nbsp;
                    {item.title}
                  </EuiLink>
                </EuiDescriptionListDescription>
              ))}
            </Fragment>
          </Fragment>
        );
      }
    }

    return <EuiDescriptionList>{items}</EuiDescriptionList>;
  }

  render() {
    const { close, title, type } = this.props;

    return (
      <EuiFlyout onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              <EuiIcon size="m" type={getSavedObjectIcon(type)} />
              &nbsp;&nbsp;
              {title}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>{this.renderRelationships()}</EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={close} size="s">
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
