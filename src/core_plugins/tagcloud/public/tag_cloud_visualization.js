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

import TagCloud from './tag_cloud';
import { Observable } from 'rxjs';
import { render, unmountComponentAtNode } from 'react-dom';
import React from 'react';


import { Label } from './label';
import { FeedbackMessage } from './feedback_message';

const MAX_TAG_COUNT = 200;

export class TagCloudVisualization {

  constructor(node, vis) {
    this._containerNode = node;

    const cloudContainer = document.createElement('div');
    cloudContainer.classList.add('tagcloud-vis');
    cloudContainer.setAttribute('data-test-subj', 'tagCloudVisualization');
    this._containerNode.appendChild(cloudContainer);

    this._vis = vis;
    this._bucketAgg = null;
    this._truncated = false;
    this._tagCloud = new TagCloud(cloudContainer);
    this._tagCloud.on('select', (event) => {
      if (!this._bucketAgg) {
        return;
      }
      const filter = this._bucketAgg.createFilter(event);
      this._vis.API.queryFilter.addFilters(filter);
    });
    this._renderComplete$ = Observable.fromEvent(this._tagCloud, 'renderComplete');


    this._feedbackNode = document.createElement('div');
    this._containerNode.appendChild(this._feedbackNode);
    this._feedbackMessage = render(<FeedbackMessage />, this._feedbackNode);

    this._labelNode = document.createElement('div');
    this._containerNode.appendChild(this._labelNode);
    this._label = render(<Label />, this._labelNode);

  }

  async render(data, status) {

    if (status.params || status.aggs) {
      this._updateParams();
    }

    if (status.data) {
      this._updateData(data);
    }


    if (status.resize) {
      this._resize();
    }

    await this._renderComplete$.take(1).toPromise();

    const hasAggDefined = this._vis.aggs[0] && this._vis.aggs[1];
    if (!hasAggDefined) {
      this._feedbackMessage.setState({
        shouldShowTruncate: false,
        shouldShowIncomplete: false
      });
      return;
    }
    this._label.setState({
      label: `${this._vis.aggs[0].makeLabel()} - ${this._vis.aggs[1].makeLabel()}`,
      shouldShowLabel: this._vis.params.showLabel
    });
    this._feedbackMessage.setState({
      shouldShowTruncate: this._truncated,
      shouldShowIncomplete: this._tagCloud.getStatus() === TagCloud.STATUS.INCOMPLETE
    });
  }


  destroy() {
    this._tagCloud.destroy();
    unmountComponentAtNode(this._feedbackNode);
    unmountComponentAtNode(this._labelNode);

  }

  _updateData(response) {
    if (!response || !response.tables.length) {
      this._tagCloud.setData([]);
      return;
    }

    const data = response.tables[0];
    const segmentAggs = this._vis.aggs.bySchemaName.segment;
    if (segmentAggs && segmentAggs.length > 0) {
      this._bucketAgg = segmentAggs[0];
    } else {
      this._bucketAgg = null;
    }

    const tags = data.rows.map(row => {
      const [tag, count] = row;
      return {
        displayText: this._bucketAgg ? this._bucketAgg.fieldFormatter()(tag) : tag,
        rawText: tag,
        value: count
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

  _updateParams() {
    this._tagCloud.setOptions(this._vis.params);
  }

  _resize() {
    this._tagCloud.resize();
  }

}
