import React from 'react';
import { PageConfig } from '../page_config';
import { WorkpadConfig } from '../workpad_config';
import { SidebarSection } from './sidebar_section';

export const GlobalConfig = () => (
  <div className="canvasSidebar">
    <SidebarSection>
      <WorkpadConfig />
    </SidebarSection>
    <SidebarSection>
      <PageConfig />
    </SidebarSection>
  </div>
);
