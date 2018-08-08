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
import PropTypes from 'prop-types';
import { embeddableShape } from 'ui/embeddable';
import { PanelOptionsMenuContainer } from './panel_options_menu_container';

export function PanelHeader({ title, panelId, embeddable, isViewOnlyMode, hidePanelTitles }) {
  if (isViewOnlyMode && (!title || hidePanelTitles)) {
    return (
      <div className="panel-heading-floater">
        <div className="kuiMicroButtonGroup">
          <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel-heading" data-test-subj={`dashboardPanelHeading-${title.replace(/\s/g, '')}`}>
      <span
        data-test-subj="dashboardPanelTitle"
        className="panel-title"
        title={title}
        aria-label={`Dashboard panel: ${title}`}
      >
        {hidePanelTitles ? '' : title}
      </span>

      <div className="kuiMicroButtonGroup">
        <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
      </div>
    </div>
  );
}

PanelHeader.propTypes = {
  isViewOnlyMode: PropTypes.bool,
  title: PropTypes.string,
  hidePanelTitles: PropTypes.bool.isRequired,
  embeddable: embeddableShape,
  panelId: PropTypes.string.isRequired,
};
