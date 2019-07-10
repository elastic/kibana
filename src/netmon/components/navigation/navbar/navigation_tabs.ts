import { Tab } from '../typings';

export const analyzeTab: Tab = {
  id: 'analyze',
  display: 'Analyze',
  path: '/kibana7/app/kibana#/discover',
};

export const alarmsTab: Tab = {
  id: 'alarms',
  display: 'Alarms',
  path: '/kibana7/app/kibana#/dashboards?title=Alarms-Dashboard',
  noactive: true,
};

export const basicTabs: Tab[] = [
  {
    id: 'rules.queryRules',
    display: 'Rules',
    path: '/rules/queryRules',
  },
  {
    id: 'tools.replay',
    display: 'Replay',
    path: '/tools/replay',
  },
  {
    id: 'configuration.syslog',
    display: 'Configuration',
    path: '/configuration/syslog',
  },
  {
    id: 'diagnostics.interface',
    display: 'Diagnostics',
    path: '/diagnostics/interface',
  },
  {
    id: 'logs.engine',
    display: 'Logs',
    path: '/logs/engine',
  },
];
