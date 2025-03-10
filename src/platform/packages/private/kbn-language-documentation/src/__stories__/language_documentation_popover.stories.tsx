/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { LanguageDocumentationPopover } from '../components/as_popover';

const sections = {
  groups: [
    {
      label: 'Section one',
      description: 'Continual delighted as elsewhere am convinced unfeeling.',
      items: [],
    },
    {
      label: 'Section two',
      items: [
        {
          label: 'Section two item 1',
          description: (
            <span>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
              dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
              mollit anim id est laborum.
            </span>
          ),
        },
        {
          label: 'Section two item 2',
          description: (
            <span>
              Was certainty remaining engrossed applauded sir how discovery. Settled opinion how
              enjoyed greater joy adapted too shy. Now properly surprise expenses interest nor
              replying she she. Bore tall nay many many time yet less. Doubtful for answered one fat
              indulged margaret sir shutters together. Ladies so in wholly around whence in at.
              Warmth he up giving oppose if. Impossible is dissimilar entreaties oh on terminated.
              Earnest studied article country ten respect showing had. But required offering him
              elegance son improved informed.
            </span>
          ),
        },
      ],
    },
  ],
  initialSection: (
    <span>
      Do am he horrible distance marriage so although. Afraid assure square so happen mr an before.
      His many same been well can high that. Forfeited did law eagerness allowance improving
      assurance bed. Had saw put seven joy short first. Pronounce so enjoyment my resembled in
      forfeited sportsman. Which vexed did began son abode short may. Interested astonished he at
      cultivated or me. Nor brought one invited she produce her.
    </span>
  ),
};

storiesOf('Language documentation popover', module).add('default', () => (
  <LanguageDocumentationPopover
    language="Test"
    sections={sections}
    buttonProps={{ color: 'text' }}
    isHelpMenuOpen={true}
    onHelpMenuVisibilityChange={() => {}}
  />
));
