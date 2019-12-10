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

import React, { Fragment } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nContext } from 'ui/i18n';

 class VisController {
   el: any;
   vis: any;

  constructor(el: any, vis: any) {
    this.el = el;
    this.vis = vis;
  }

  async render(visData, visParams, status) {
    if (status.params || (visParams.useTimeFilter && status.time)) {
      this.visParams = visParams;
      this.drawVis();
    }
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }

  drawVis = () => {
    const text = 'Vis controller';
    render(null, this.el);
  };

  async initControls() {
    // const controlParamsList = this.visParams.controls.filter((controlParams) => {
    //   // ignore controls that do not have indexPattern or field
    //   return controlParams.indexPattern && controlParams.fieldName;
    // });

    // const controlFactoryPromises = controlParamsList.map((controlParams) => {
    //   const factory = controlFactory(controlParams);
    //   return factory(controlParams, this.visParams.useTimeFilter, SearchSource);
    // });
    // const controls = await Promise.all(controlFactoryPromises);

    // const getControl = (id) => {
    //   return controls.find(control => {
    //     return id === control.id;
    //   });
    // };

    // const controlInitPromises = [];
    // getLineageMap(controlParamsList).forEach((lineage, controlId) => {
    //   // first lineage item is the control. remove it
    //   lineage.shift();
    //   const ancestors = [];
    //   lineage.forEach(ancestorId => {
    //     ancestors.push(getControl(ancestorId));
    //   });
    //   const control = getControl(controlId);
    //   control.setAncestors(ancestors);
    //   controlInitPromises.push(control.fetch());
    // });

    // await Promise.all(controlInitPromises);
    // return controls;
  }

  stageFilter = async (controlIndex, newValue) => {
    if (this.visParams.updateFiltersOnChange) {
    } else {
      this.drawVis();
    }
  }
}

export { VisController };
