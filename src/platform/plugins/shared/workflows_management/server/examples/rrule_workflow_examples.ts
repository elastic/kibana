/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateWorkflowCommand } from '@kbn/workflows';

/**
 * Example of a daily backup workflow using RRule
 * Runs every day at 2:00 AM UTC
 */
export const createDailyBackupWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Daily Database Backup'
description: 'Automated daily backup of critical database at 2:00 AM UTC'
enabled: true
triggers:
  - type: 'scheduled'
    enabled: true
    with:
      rrule:
        freq: 'DAILY'
        interval: 1
        tzid: 'UTC'
        byhour: [2]
        byminute: [0]
steps:
  - name: 'Log backup start'
    type: 'console'
    with:
      message: 'Starting daily backup at {{now}}'

  - name: 'Create backup'
    type: 'elasticsearch.request'
    with:
      method: 'POST'
      path: '/_snapshot/backup_repo/snapshot_{{now | date("YYYY-MM-DD")}}'
      body:
        indices: 'critical_data_*'
        ignore_unavailable: true
        include_global_state: false

  - name: 'Verify backup'
    type: 'elasticsearch.request'
    with:
      method: 'GET'
      path: '/_snapshot/backup_repo/snapshot_{{now | date("YYYY-MM-DD")}}'

  - name: 'Log backup completion'
    type: 'console'
    with:
      message: 'Daily backup completed successfully at {{now}}'
`,
  };
};

/**
 * Example of a weekly report workflow using RRule
 * Runs every Monday and Friday at 9:00 AM EST
 */
export const createWeeklyReportWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Weekly Performance Report'
description: 'Generate and send weekly performance reports on Monday and Friday at 9:00 AM EST'
enabled: true
triggers:
  - type: 'scheduled'
    enabled: true
    with:
      rrule:
        freq: 'WEEKLY'
        interval: 1
        tzid: 'America/New_York'
        byweekday: ['MO', 'FR']
        byhour: [9]
        byminute: [0]
steps:
  - name: 'Generate report data'
    type: 'elasticsearch.request'
    with:
      method: 'POST'
      path: '/_search'
      body:
        index: 'performance_metrics'
        size: 0
        aggs:
          avg_performance:
            avg:
              field: 'response_time'
          total_requests:
            value_count:
              field: 'request_id'

  - name: 'Format report'
    type: 'console'
    with:
      message: |
        Weekly Performance Report - {{now | date("YYYY-MM-DD")}}
        Average Response Time: {{steps.generate_report_data.output.aggregations.avg_performance.value}}ms
        Total Requests: {{steps.generate_report_data.output.aggregations.total_requests.value}}

  - name: 'Send report'
    type: 'slack'
    connector-id: 'slack-reports'
    with:
      message: |
        📊 Weekly Performance Report - {{now | date("YYYY-MM-DD")}}
        📈 Average Response Time: {{steps.generate_report_data.output.aggregations.avg_performance.value}}ms
        📊 Total Requests: {{steps.generate_report_data.output.aggregations.total_requests.value}}
`,
  };
};

/**
 * Example of a monthly maintenance workflow using RRule
 * Runs on the 1st and 15th of every month at 10:30 PM UTC
 */
export const createMonthlyMaintenanceWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Monthly System Maintenance'
description: 'Perform monthly system maintenance tasks on 1st and 15th at 10:30 PM UTC'
enabled: true
triggers:
  - type: 'scheduled'
    enabled: true
    with:
      rrule:
        freq: 'MONTHLY'
        interval: 1
        tzid: 'UTC'
        bymonthday: [1, 15]
        byhour: [22]
        byminute: [30]
steps:
  - name: 'Log maintenance start'
    type: 'console'
    with:
      message: 'Starting monthly maintenance at {{now}}'

  - name: 'Clean old indices'
    type: 'elasticsearch.request'
    with:
      method: 'DELETE'
      path: '/logs-{{now | date("YYYY.MM") | subtract(3)}}*'

  - name: 'Optimize indices'
    type: 'elasticsearch.request'
    with:
      method: 'POST'
      path: '/_forcemerge'
      body:
        max_num_segments: 1
        index: 'logs-*'

  - name: 'Update cluster settings'
    type: 'elasticsearch.request'
    with:
      method: 'PUT'
      path: '/_cluster/settings'
      body:
        persistent:
          cluster.routing.allocation.disk.threshold_enabled: true
          cluster.routing.allocation.disk.watermark.low: '85%'
          cluster.routing.allocation.disk.watermark.high: '90%'

  - name: 'Log maintenance completion'
    type: 'console'
    with:
      message: 'Monthly maintenance completed successfully at {{now}}'
`,
  };
};

/**
 * Example of a business hours workflow using RRule
 * Runs every weekday (Monday-Friday) at 8:00 AM and 5:00 PM EST
 */
export const createBusinessHoursWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Business Hours Monitoring'
description: 'Monitor system health during business hours - weekdays at 8 AM and 5 PM EST'
enabled: true
triggers:
  - type: 'scheduled'
    enabled: true
    with:
      rrule:
        freq: 'DAILY'
        interval: 1
        tzid: 'America/New_York'
        byweekday: ['MO', 'TU', 'WE', 'TH', 'FR']
        byhour: [8, 17]
        byminute: [0]
steps:
  - name: 'Check system health'
    type: 'elasticsearch.request'
    with:
      method: 'GET'
      path: '/_cluster/health'

  - name: 'Check disk usage'
    type: 'elasticsearch.request'
    with:
      method: 'GET'
      path: '/_cat/allocation?v&h=node,disk.used_percent'

  - name: 'Log health status'
    type: 'console'
    with:
      message: |
        Business Hours Health Check - {{now | date("YYYY-MM-DD HH:mm")}}
        Cluster Status: {{steps.check_system_health.output.status}}
        Active Shards: {{steps.check_system_health.output.active_shards}}
        Disk Usage: {{steps.check_disk_usage.output}}

  - name: 'Alert if unhealthy'
    type: 'slack'
    connector-id: 'slack-alerts'
    with:
      message: |
        🚨 System Health Alert - {{now | date("YYYY-MM-DD HH:mm")}}
        Status: {{steps.check_system_health.output.status}}
        Active Shards: {{steps.check_system_health.output.active_shards}}
        Please investigate if status is not 'green'
`,
  };
};

/**
 * Example of a complex multi-time workflow using RRule
 * Runs at multiple times: 6 AM, 12 PM, and 6 PM daily
 */
export const createMultiTimeWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Multi-Time Data Sync'
description: 'Sync data at multiple times daily: 6 AM, 12 PM, and 6 PM UTC'
enabled: true
triggers:
  - type: 'scheduled'
    enabled: true
    with:
      rrule:
        freq: 'DAILY'
        interval: 1
        tzid: 'UTC'
        byhour: [6, 12, 18]
        byminute: [0]
steps:
  - name: 'Determine sync type'
    type: 'console'
    with:
      message: |
        Starting data sync at {{now | date("HH:mm")}} UTC
        Sync type: {{if steps.determine_sync_type.output.hour < 12 then "morning" else if steps.determine_sync_type.output.hour < 18 then "afternoon" else "evening"}}

  - name: 'Sync user data'
    type: 'elasticsearch.request'
    with:
      method: 'POST'
      path: '/_reindex'
      body:
        source:
          index: 'users_staging'
        dest:
          index: 'users_production'
        script:
          source: |
            if (ctx._source.last_updated < params.cutoff) {
              ctx.op = 'noop';
            }
          params:
            cutoff: '{{now | subtract("24h") | date("yyyy-MM-dd")}}'

  - name: 'Update sync status'
    type: 'elasticsearch.request'
    with:
      method: 'POST'
      path: '/sync_logs/_doc'
      body:
        timestamp: '{{now}}'
        sync_type: '{{if steps.determine_sync_type.output.hour < 12 then "morning" else if steps.determine_sync_type.output.hour < 18 then "afternoon" else "evening"}}'
        status: 'completed'

  - name: 'Log completion'
    type: 'console'
    with:
      message: 'Data sync completed successfully at {{now}}'
`,
  };
};

/**
 * Example of a workflow with custom start date using RRule
 * Runs daily at 3 PM UTC starting from a specific date
 */
export const createCustomStartDateWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Custom Start Date Workflow'
description: 'Daily workflow starting from a specific date - runs at 3 PM UTC'
enabled: true
triggers:
  - type: 'scheduled'
    enabled: true
    with:
      rrule:
        freq: 'DAILY'
        interval: 1
        tzid: 'UTC'
        dtstart: '2024-01-15T15:00:00Z'
        byhour: [15]
        byminute: [0]
steps:
  - name: 'Log execution'
    type: 'console'
    with:
      message: 'Custom start date workflow executed at {{now}}'

  - name: 'Process data'
    type: 'elasticsearch.request'
    with:
      method: 'POST'
      path: '/_search'
      body:
        index: 'custom_data'
        size: 100
        query:
          range:
            created_at:
              gte: '{{now | subtract("1d") | date("yyyy-MM-dd")}}'
              lt: '{{now | date("yyyy-MM-dd")}}'

  - name: 'Update processing status'
    type: 'console'
    with:
      message: 'Processed {{steps.process_data.output.hits.total.value}} records'
`,
  };
};

/**
 * Get all RRule workflow examples
 */
export const getAllRRuleWorkflowExamples = (): CreateWorkflowCommand[] => {
  return [
    createDailyBackupWorkflowExample(),
    createWeeklyReportWorkflowExample(),
    createMonthlyMaintenanceWorkflowExample(),
    createBusinessHoursWorkflowExample(),
    createMultiTimeWorkflowExample(),
    createCustomStartDateWorkflowExample(),
  ];
};
