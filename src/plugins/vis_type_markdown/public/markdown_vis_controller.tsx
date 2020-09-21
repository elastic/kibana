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
import { Markdown } from '../../kibana_react/public';
import { MarkdownVisParams } from './types';

interface MarkdownVisComponentProps extends MarkdownVisParams {
  renderComplete: () => void;
}

/**
 * The MarkdownVisComponent renders markdown to HTML and presents it.
 */
class MarkdownVisComponent extends React.Component<MarkdownVisComponentProps> {
  /**
   * Will be called after the first render when the component is present in the DOM.
   *
   * We call renderComplete here, to signal, that we are done with rendering.
   */
  componentDidMount() {
    this.props.renderComplete();
  }

  /**
   * Will be called after the component has been updated and the changes has been
   * flushed into the DOM.
   *
   * We will use this to signal that we are done rendering by calling the
   * renderComplete property.
   */
  componentDidUpdate() {
    this.props.renderComplete();
  }

  /**
   * Render the actual HTML.
   * Note: if only fontSize parameter has changed, this method will be called
   * and return the appropriate JSX, but React will detect, that only the
   * style argument has been updated, and thus only set this attribute to the DOM.
   */
  render() {
    return (
      <div className="mkdVis" style={{ fontSize: `${this.props.fontSize}pt` }}>
        <Markdown
          data-test-subj="markdownBody"
          markdown={this.props.markdown}
          openLinksInNewTab={this.props.openLinksInNewTab}
        />
      </div>
    );
  }
}

/**
 * This is a wrapper component, that is actually used as the visualization.
 * The sole purpose of this component is to extract all required parameters from
 * the properties and pass them down as separate properties to the actual component.
 * That way the actual (MarkdownVisComponent) will properly trigger it's prop update
 * callback (componentWillReceiveProps) if one of these params change. It wouldn't
 * trigger otherwise (e.g. it doesn't for this wrapper), since it only triggers
 * if the reference to the prop changes (in this case the reference to vis).
 *
 * The way React works, this wrapper nearly brings no overhead, but allows us
 * to use proper lifecycle methods in the actual component.
 */

export interface MarkdownVisWrapperProps {
  visParams: MarkdownVisParams;
  fireEvent: (event: any) => void;
  renderComplete: () => void;
}

export function MarkdownVisWrapper(props: MarkdownVisWrapperProps) {
  return (
    <MarkdownVisComponent
      fontSize={props.visParams.fontSize}
      markdown={props.visParams.markdown}
      openLinksInNewTab={props.visParams.openLinksInNewTab}
      renderComplete={props.renderComplete}
    />
  );
}
