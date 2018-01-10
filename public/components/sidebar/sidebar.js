import { compose, branch, renderComponent } from 'recompose';
import { SidebarComponent } from './sidebar_component';
import { GlobalConfig } from './global_config';
import './sidebar.less';

const branches = [branch(props => !props.element, renderComponent(GlobalConfig))];

export const Sidebar = compose(...branches)(SidebarComponent);
