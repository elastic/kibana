import React from 'react';
import { PageConfig } from '../page_config';
import { WorkpadConfig } from '../workpad_config';

export const GlobalConfig = () => (
  <div className="canvas__global-config">
    <WorkpadConfig/>

    <hr/>

    <PageConfig/>
  </div>
);
