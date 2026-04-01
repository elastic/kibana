/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { DrilldownManagerTitle } from '../drilldown_manager_title';
import { useDrilldownsManager } from '../context';
import { DrilldownFactoryView } from '../drilldown_factory_view';
import { DrilldownManagerFooter } from '../drilldown_manager_footer';
import { DrilldownStateForm } from '../drilldown_state_form';
import { ButtonSubmit } from '../../components/button_submit';

const txtEditDrilldown = i18n.translate(
  'embeddableApi.drilldowns.containers.editDrilldownForm.title',
  {
    defaultMessage: 'Edit Drilldown',
    description: 'Drilldowns flyout title for edit drilldown form.',
  }
);

const txtEditDrilldownButton = i18n.translate(
  'embeddableApi.drilldowns.containers.editDrilldownForm.primaryButton',
  {
    defaultMessage: 'Save',
    description: 'Primary button on new drilldown edit form.',
  }
);

export interface EditDrilldownFormProps {
  actionId: string;
}

export const EditDrilldownForm: React.FC<EditDrilldownFormProps> = ({ actionId }) => {
  const isMounted = useMountedState();
  const drilldowns = useDrilldownsManager();
  const drilldown = React.useMemo(
    () => drilldowns.createDrilldownManager(actionId),
    [drilldowns, actionId]
  );
  const [disabled, setDisabled] = React.useState(false);

  if (!drilldown) return null;

  const handleSave = () => {
    setDisabled(true);
    drilldowns.updateDrilldown(actionId, drilldown).finally(() => {
      if (!isMounted()) return;
      setDisabled(false);
    });
  };

  return (
    <>
      <DrilldownManagerTitle>{txtEditDrilldown}</DrilldownManagerTitle>
      <DrilldownFactoryView constant factory={drilldown.factory} />
      {drilldown && <DrilldownStateForm drilldown={drilldown} disabled={disabled} />}
      {drilldown && (
        <DrilldownManagerFooter>
          <ButtonSubmit disabled={disabled} onClick={handleSave}>
            {txtEditDrilldownButton}
          </ButtonSubmit>
        </DrilldownManagerFooter>
      )}
    </>
  );
};
