/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiAvatar } from '@elastic/eui';
import React from 'react';
interface SpaceInvadersProps {
  avatarUrl: string;
}

export const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ avatarUrl }) => {
  return (
    <div>
      <div className="invaders_box">
        <div className="invaders">
          <div className="invader">🧟👾🧟🐞👹🪲😡👾🪲🦖</div>
          <div className="invader">🐞👾🪲🐞👾🪲🐞👾🪲🐞</div>
          <div className="invader">🐞👾🪲🐞👾🪲🐞👾🪲🐞</div>
          <div className="invader">🐞👾🪲🐞👾🪲🐞👾🪲🐞</div>
        </div>
        <div className="invader_team shooter_btm">
          <EuiAvatar size="l" name="Developer" imageUrl={avatarUrl} />
        </div>
      </div>
    </div>
  );
};
