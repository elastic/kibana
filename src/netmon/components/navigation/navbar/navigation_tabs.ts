import { Tab } from '../typings';

export const analyzeTab: Tab = {
  id: 'analyze',
  display: 'Analyze',
  path: '/kibana7/app/kibana#/discover',
};

export const alarmsTab: Tab = {
  id: 'alarms',
  display: 'Alarms',
  path: '/analyze/app/kibana#/dashboards?title=Alarms%20Dashboard',
  noactive: true,
};

export const basicTabs: Tab[] = [
  {
    id: 'rules',
    display: 'Rules',
    path: '/rules/queryRules',
  },
  {
    id: 'tools',
    display: 'Replay',
    path: '/tools/replay',
  },
  {
    id: 'configuration',
    display: 'Configuration',
    path: '/configuration/syslog',
  },
  {
    id: 'diagnostics',
    display: 'Diagnostics',
    path: '/diagnostics/interface',
  },
  {
    id: 'logs',
    display: 'Logs',
    path: '/logs/engine',
  },
];
