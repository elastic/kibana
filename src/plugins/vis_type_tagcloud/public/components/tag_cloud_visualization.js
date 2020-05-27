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
import * as Rx from 'rxjs';
import { take } from 'rxjs/operators';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

import { getFormatService } from '../services';

import { Label } from './label';
import { TagCloud } from './tag_cloud';
import { FeedbackMessage } from './feedback_message';
import d3 from 'd3';

const MAX_TAG_COUNT = 200;

export function createTagCloudVisualization({ colors }) {
  const colorScale = d3.scale.ordinal().range(colors.seedColors);
  return class TagCloudVisualization {
    constructor(node, vis) {
      this._containerNode = node;

      const cloudRelativeContainer = document.createElement('div');
      cloudRelativeContainer.classList.add('tgcVis');
      cloudRelativeContainer.setAttribute('style', 'position: relative');
      const cloudContainer = document.createElement('div');
      cloudContainer.classList.add('tgcVis');
      cloudContainer.setAttribute('data-test-subj', 'tagCloudVisualization');
      this._containerNode.classList.add('visChart--vertical');
      cloudRelativeContainer.appendChild(cloudContainer);
      this._containerNode.appendChild(cloudRelativeContainer);

      this._vis = vis;
      this._truncated = false;
      this._tagCloud = new TagCloud(cloudContainer, colorScale);
      this._tagCloud.on('select', (event) => {
        if (!this._visParams.bucket) {
          return;
        }
        this._vis.API.events.filter({
          table: event.meta.data,
          column: 0,
          row: event.meta.rowIndex,
        });
      });
      this._renderComplete$ = Rx.fromEvent(this._tagCloud, 'renderComplete');

      this._feedbackNode = document.createElement('div');
      this._containerNode.appendChild(this._feedbackNode);
      this._feedbackMessage = React.createRef();
      render(
        <I18nProvider>
          <FeedbackMessage ref={this._feedbackMessage} />
        </I18nProvider>,
        this._feedbackNode
      );

      this._labelNode = document.createElement('div');
      this._containerNode.appendChild(this._labelNode);
      this._label = React.createRef();
      render(<Label ref={this._label} />, this._labelNode);
    }

    async render(data, visParams) {
      this._updateParams(visParams);
      this._updateData(data);
      this._resize();

      await this._renderComplete$.pipe(take(1)).toPromise();

      if (data.columns.length !== 2) {
        this._feedbackMessage.current.setState({
          shouldShowTruncate: false,
          shouldShowIncomplete: false,
        });
        return;
      }

      this._label.current.setState({
        label: `${data.columns[0].name} - ${data.columns[1].name}`,
        shouldShowLabel: visParams.showLabel,
      });
      this._feedbackMessage.current.setState({
        shouldShowTruncate: this._truncated,
        shouldShowIncomplete: this._tagCloud.getStatus() === TagCloud.STATUS.INCOMPLETE,
      });
    }

    destroy() {
      this._tagCloud.destroy();
      unmountComponentAtNode(this._feedbackNode);
      unmountComponentAtNode(this._labelNode);
    }

    _updateData(data) {
      if (!data || !data.rows.length) {
        this._tagCloud.setData([]);
        return;
      }

      const bucket = this._visParams.bucket;
      const metric = this._visParams.metric;
      const bucketFormatter = bucket ? getFormatService().deserialize(bucket.format) : null;
      const tagColumn = bucket ? data.columns[bucket.accessor].id : -1;
      const metricColumn = data.columns[metric.accessor].id;
      const tags = data.rows.map((row, rowIndex) => {
        const tag = row[tagColumn] === undefined ? 'all' : row[tagColumn];
        const metric = row[metricColumn];
        return {
          displayText: bucketFormatter ? bucketFormatter.convert(tag, 'text') : tag,
          rawText: tag,
          value: metric,
          meta: {
            data: data,
            rowIndex: rowIndex,
          },
        };
      });

      if (tags.length > MAX_TAG_COUNT) {
        tags.length = MAX_TAG_COUNT;
        this._truncated = true;
      } else {
        this._truncated = false;
      }

      this._tagCloud.setData(tags);
    }

    _updateParams(visParams) {
      this._visParams = visParams;
      this._tagCloud.setOptions(visParams);
    }

    _resize() {
      this._tagCloud.resize();
    }
  };
}
