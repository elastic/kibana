/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { isEqual } from 'lodash';
import { I18nProvider } from '@kbn/i18n/react';
import { DocViewRenderTab } from './doc_viewer_render_tab';
import { DocViewerError } from './doc_viewer_render_error';
import { DocViewRenderFn, DocViewRenderProps } from '../../doc_views/doc_views_types';
import { getServices } from '../../../kibana_services';
import { KibanaContextProvider } from '../../../../../kibana_react/public';

interface Props {
  component?: React.ComponentType<DocViewRenderProps>;
  id: number;
  render?: DocViewRenderFn;
  renderProps: DocViewRenderProps;
  title: string;
}

interface State {
  error: Error | string;
  hasError: boolean;
}
/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export class DocViewerTab extends React.Component<Props, State> {
  state = {
    hasError: false,
    error: '',
  };

  static getDerivedStateFromError(error: unknown) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return (
      nextProps.renderProps.hit._id !== this.props.renderProps.hit._id ||
      nextProps.id !== this.props.id ||
      !isEqual(nextProps.renderProps.columns, this.props.renderProps.columns) ||
      nextState.hasError
    );
  }

  render() {
    const { component, render, renderProps, title } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      return <DocViewerError error={error} />;
    } else if (!render && !component) {
      return (
        <DocViewerError
          error={`Invalid plugin ${title}, there is neither a (react) component nor a render function provided`}
        />
      );
    }

    if (render) {
      // doc view is provided by a render function, e.g. for legacy Angular code
      return <DocViewRenderTab render={render} renderProps={renderProps} />;
    }

    // doc view is provided by a react component

    const Component = component as any;
    return (
      <I18nProvider>
        <KibanaContextProvider services={{ uiSettings: getServices().uiSettings }}>
          <Component {...renderProps} />
        </KibanaContextProvider>
      </I18nProvider>
    );
  }
}
