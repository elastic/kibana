import React from 'react';
import { PageConfig } from '../page_config';
import { WorkpadConfig } from '../workpad_config';
import { SidebarSection } from './sidebar_section';
import { SidebarSectionTitle } from './sidebar_section_title';


export const GlobalConfig = () => (
  <div className="canvas__sidebar">
    <SidebarSectionTitle title="Workpad Settings"/>
    <SidebarSection>
      <WorkpadConfig/>
      <hr/>
      <PageConfig/>
    </SidebarSection>
  </div>
);
