/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class SpaceSettingsPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');

  public async navigateTo(spaceName: string = 'default') {
    await this.common.navigateToUrl('management', `kibana/spaces/edit/${spaceName}`, {
      shouldUseHashForSubUrl: false,
    });
  }

  public async switchSpace(spaceName: string) {
    await this.testSubjects.click('spacesNavSelector');
    await this.testSubjects.click(`${spaceName}-selectableSpaceItem`);
  }

  public async switchSpaceSolutionType({
    spaceName = 'default',
    solution = 'oblt',
  }: {
    spaceName?: string;
    solution?: 'security' | 'oblt' | 'search' | 'classic';
  }) {
    const solutionSpecificTestSubjectMap = {
      search: 'solutionViewEsOption',
      oblt: 'solutionViewObltOption',
      security: 'solutionViewSecurityOption',
      classic: 'solutionViewClassicOption',
    };

    await this.navigateTo(spaceName);
<<<<<<< HEAD
=======
    // ensure the edit form is fully rendered before interacting  with it
>>>>>>> 7a4a3d4a761e (wait for reload in switchSpaceSolutionType to prevent renderer timeout)
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.existOrFail('spaces-view-page');

    await this.testSubjects.click('solutionViewSelect');
    await this.testSubjects.click(solutionSpecificTestSubjectMap[solution]);
    await this.testSubjects.click('save-space-button');
    await this.common.clickConfirmOnModal();
    await this.header.waitUntilLoadingHasFinished();
<<<<<<< HEAD
    await this.testSubjects.existOrFail('spaces-grid-page');
=======
>>>>>>> 7a4a3d4a761e (wait for reload in switchSpaceSolutionType to prevent renderer timeout)
  }
}
