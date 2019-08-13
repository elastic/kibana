/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { DocViewRenderProps, DocViewRenderFn } from 'ui/registry/doc_views';
import { DocViewRenderTab } from './doc_viewer_render_tab';
import { DocViewerError } from './doc_viewer_render_error';

interface Props {
  component?: React.Component | React.FunctionComponent;
  render?: DocViewRenderFn;
  renderProps: DocViewRenderProps;
  title: string;
}

interface State {
  hasError: boolean;
  error: null | Error | string;
}
/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thank's to
 * Error Boundaries.
 */
export class DocViewerTab extends React.Component<Props, State> {
  state = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: unknown) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
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
    const Component = component;
    // @ts-ignore
    return <Component {...renderProps} />;
  }
}
