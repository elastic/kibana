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
import {
  getSavedObjectIcon,
  getInAppUrl,
  getSavedObjectLabel,
} from '../../../../lib';

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
    this.getRelationshipData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.id !== this.props.id) {
      this.getRelationshipData();
    }
  }

  async getRelationshipData() {
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
          <EuiDescriptionListTitle key={`${type}_not_found`}>
            No {type} found.
          </EuiDescriptionListTitle>
        );
      } else {
        // let node;
        let calloutTitle = 'Warning';
        let calloutColor = 'warning';
        let calloutText;

        switch (this.props.type) {
          case 'dashboard':
            calloutColor = 'success';
            calloutTitle = 'Dashboard';
            calloutText = `Here are some visualizations used on this dashboard. You can
            safely delete this dashboard and the visualizations will still
            work properly.`;
            break;
          case 'search':
            if (type === 'visualizations') {
              calloutText = `Here are some visualizations that use this saved search. If
              you delete this saved search, these visualizations will not
              longer work properly.`;
            } else {
              calloutColor = 'success';
              calloutTitle = 'Saved Search';
              calloutText = `Here is the index pattern tied to this saved search.`;
            }
            break;
          case 'visualization':
            calloutText = `Here are some dashboards which contain this visualization. If
            you delete this visualization, these dashboards will no longer
            show them.`;
            break;
          case 'index-pattern':
            if (type === 'visualizations') {
              calloutText = `Here are some visualizations that use this index pattern. If
              you delete this index pattern, these visualizations will not
              longer work properly.`;
            } else if (type === 'searches') {
              calloutText = `Here are some saved searches that use this index pattern. If
              you delete this index pattern, these saved searches will not
              longer work properly.`;
            }
            break;
        }

        items.push(
          <Fragment key={type}>
            <EuiDescriptionListTitle style={{ marginBottom: '1rem' }}>
              <EuiCallOut color={calloutColor} title={calloutTitle}>
                <p>{calloutText}</p>
              </EuiCallOut>
            </EuiDescriptionListTitle>
            <Fragment>
              {list.map(item => (
                <EuiDescriptionListDescription key={item.id}>
                  <EuiLink href={`#${getInAppUrl(item.id, type)}`}>
                    <EuiIcon
                      aria-label={getSavedObjectLabel(type)}
                      size="s"
                      type={getSavedObjectIcon(type)}
                    />
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
              <EuiIcon
                aria-label={getSavedObjectLabel(type)}
                size="m"
                type={getSavedObjectIcon(type)}
              />
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
