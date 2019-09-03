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

/**
 * IMPORTANT: If you make changes to this API, please make sure to check that
 * the docs (docs/development/visualize/development-create-visualization.asciidoc)
 * are up to date.
 */

import chrome from '../../chrome';
import { FilterBarQueryFilterProvider } from '../../filter_manager/query_filter';
import { IPrivate } from '../../private';
import { EmbeddedVisualizeHandler } from './embedded_visualize_handler';
import { VisSavedObject, VisualizeLoaderParams } from './types';

export class VisualizeLoader {
  constructor(
    private readonly savedVisualizations: any,
    private readonly pipelineDataLoader: boolean,
    private readonly Private: IPrivate
  ) {}

  /**
   * Renders a saved visualization specified by its id into a DOM element.
   *
   * @param element The DOM element to render the visualization into.
   *    You can alternatively pass a jQuery element instead.
   * @param id The id of the saved visualization. This is the id of the
   *    saved object that is stored in the .kibana index.
   * @param params A list of parameters that will influence rendering.
   *
   * @return A promise that resolves to the
   *    handler for this visualization as soon as the saved object could be found.
   */
  public async embedVisualizationWithId(
    element: HTMLElement,
    savedVisualizationId: string,
    params: VisualizeLoaderParams
  ) {
    return new Promise((resolve, reject) => {
      this.savedVisualizations.get(savedVisualizationId).then((savedObj: VisSavedObject) => {
        const handler = this.renderVis(element, savedObj, params);
        resolve(handler);
      }, reject);
    });
  }

  /**
   * Renders a saved visualization specified by its savedObject into a DOM element.
   * In most of the cases you will need this method, since it allows you to specify
   * filters, handlers, queries, etc. on the savedObject before rendering.
   *
   * We do not encourage you to use this method, since it will most likely be changed
   * or removed in a future version of Kibana. Rather embed a visualization by its id
   * via the {@link #embedVisualizationWithId} method.
   *
   * @deprecated You should rather embed by id, since this method will be removed in the future.
   * @param element The DOM element to render the visualization into.
   *    You can alternatively pass a jQuery element instead.
   * @param savedObj The savedObject as it could be retrieved by the
   *    `savedVisualizations` service.
   * @param params A list of parameters that will influence rendering.
   *
   * @return The handler to the visualization.
   */
  public embedVisualizationWithSavedObject(
    el: HTMLElement,
    savedObj: VisSavedObject,
    params: VisualizeLoaderParams
  ) {
    return this.renderVis(el, savedObj, params);
  }

  /**
   * Returns a promise, that resolves to a list of all saved visualizations.
   *
   * @return Resolves with a list of all saved visualizations as
   *    returned by the `savedVisualizations` service in Kibana.
   */
  public getVisualizationList(): Promise<any[]> {
    return this.savedVisualizations.find().then((result: any) => result.hits);
  }

  private renderVis(
    container: HTMLElement,
    savedObj: VisSavedObject,
    params: VisualizeLoaderParams
  ) {
    const { vis, description, searchSource } = savedObj;

    vis.description = description;
    vis.searchSource = searchSource;

    if (!params.append) {
      container.innerHTML = '';
    }

    const element = document.createElement('div');
    element.className = 'visualize';
    element.setAttribute('data-test-subj', 'visualizationLoader');
    container.appendChild(element);
    // We need the container to have display: flex so visualization will render correctly
    container.style.display = 'flex';

    // If params specified cssClass, we will set this to the element.
    if (params.cssClass) {
      params.cssClass.split(' ').forEach(cssClass => {
        element.classList.add(cssClass);
      });
    }

    // Apply data- attributes to the element if specified
    const dataAttrs = params.dataAttrs;
    if (dataAttrs) {
      Object.keys(dataAttrs).forEach(key => {
        element.setAttribute(`data-${key}`, dataAttrs[key]);
      });
    }

    const handlerParams = {
      ...params,
      // lets add query filter angular service to the params
      queryFilter: this.Private(FilterBarQueryFilterProvider),
      // lets add Private to the params, we'll need to pass it to visualize later
      Private: this.Private,
      pipelineDataLoader: this.pipelineDataLoader,
    };

    return new EmbeddedVisualizeHandler(element, savedObj, handlerParams);
  }
}

function VisualizeLoaderProvider(
  savedVisualizations: any,
  interpreterConfig: any,
  Private: IPrivate
) {
  return new VisualizeLoader(savedVisualizations, interpreterConfig.enableInVisualize, Private);
}

/**
 * Returns a promise, that resolves with the visualize loader, once it's ready.
 * @return A promise, that resolves to the visualize loader.
 */
function getVisualizeLoader(): Promise<VisualizeLoader> {
  return chrome.dangerouslyGetActiveInjector().then($injector => {
    const Private: IPrivate = $injector.get('Private');
    return Private(VisualizeLoaderProvider);
  });
}

export { getVisualizeLoader, VisualizeLoaderProvider };
