/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { EuiPageTemplate, EuiSpacer, EuiTabbedContent, EuiText, EuiTitle } from '@elastic/eui';

import {
  APP_TITLE,
  JOB_ATTACH_PATH,
  JOB_DETACH_PATH,
  JOB_PATH,
  JOB_RUN_PATH,
  JOBS_PATH,
  STATUS_PATH,
} from '../common/constants';
import type { ExampleJob, SerializedUser, StatusResponse } from '../common/types';
import { AccountsDirectory } from './components/accounts_directory';
import { ApiInspector } from './components/api_inspector';
import { AttachFlyout } from './components/attach_flyout';
import { JobDetail } from './components/job_detail';
import { JobList } from './components/job_list';
import { ServiceAccountFlyout } from './components/service_account_flyout';
import { appendCallLog, type CallLogEntry } from './lib/call_log';
import { formatError } from './lib/format_error';

interface Props {
  coreStart: CoreStart;
}

const jobPath = (template: string, id: string) => template.replace('{id}', encodeURIComponent(id));

const ServiceAccountsExampleApp = ({ coreStart }: Props) => {
  const { http, security } = coreStart;
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ExampleJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ExampleJob | null>(null);
  const [you, setYou] = useState<SerializedUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [viewedServiceAccountId, setViewedServiceAccountId] = useState<string | null>(null);

  const record = useCallback((entry: CallLogEntry) => {
    setCallLog((previous) => appendCallLog(previous, entry));
  }, []);

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setBusy(label);
      const started = Date.now();
      try {
        const payload = await fn();
        record({
          at: new Date().toISOString(),
          label,
          durationMs: Date.now() - started,
          ok: true,
          payload,
        });
        return payload;
      } catch (error) {
        record({
          at: new Date().toISOString(),
          label,
          durationMs: Date.now() - started,
          ok: false,
          payload: { error: formatError(error) },
        });
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [record]
  );

  const refreshStatus = useCallback(async () => {
    try {
      const next = await http.get<StatusResponse>(STATUS_PATH);
      setStatus(next);
      setStatusError(null);
    } catch (error) {
      setStatusError(formatError(error));
    }
  }, [http]);

  const refreshYou = useCallback(async () => {
    try {
      const user = await security.authc.getCurrentUser();
      setYou({
        username: user.username,
        roles: user.roles,
        profile_uid: user.profile_uid,
        authentication_realm: user.authentication_realm,
        lookup_realm: user.lookup_realm,
        authentication_provider: user.authentication_provider,
        authentication_type: user.authentication_type,
        http_authentication_scheme: user.http_authentication_scheme ?? undefined,
        elastic_cloud_user: user.elastic_cloud_user,
      });
    } catch {
      setYou(null);
    }
  }, [security.authc]);

  const refreshJobs = useCallback(async () => {
    const payload = (await run('List jobs', () => http.get<{ jobs: ExampleJob[] }>(JOBS_PATH))) as
      | { jobs: ExampleJob[] }
      | undefined;
    if (payload) {
      setJobs(payload.jobs);
      setSelectedJob((current) =>
        current ? payload.jobs.find((job) => job.id === current.id) ?? current : current
      );
    }
  }, [http, run]);

  useEffect(() => {
    void refreshStatus();
    void refreshYou();
    void refreshJobs();
  }, [refreshJobs, refreshStatus, refreshYou]);

  const upsertJob = (job: ExampleJob) => {
    setJobs((previous) => {
      const without = previous.filter((item) => item.id !== job.id);
      return [job, ...without];
    });
    setSelectedJob(job);
  };

  const onCreateJob = (params: { title: string; description?: string }) => {
    void run('Create job', async () => {
      const payload = await http.post<{ job: ExampleJob }>(JOBS_PATH, {
        body: JSON.stringify(params),
      });
      upsertJob(payload.job);
      return payload;
    });
  };

  const onAttach = async (serviceAccountId: string) => {
    if (!selectedJob) {
      return;
    }
    await run('Attach', async () => {
      const payload = await http.post<{ job: ExampleJob }>(
        jobPath(JOB_ATTACH_PATH, selectedJob.id),
        {
          body: JSON.stringify({ serviceAccountId }),
        }
      );
      upsertJob(payload.job);
      setAttachOpen(false);
      return payload;
    });
  };

  const onCreateAndAttach = async (params: { name: string }) => {
    if (!selectedJob) {
      return;
    }
    await run('Create and attach', async () => {
      const created = await security.serviceAccounts.create(params);
      const payload = await http.post<{ job: ExampleJob }>(
        jobPath(JOB_ATTACH_PATH, selectedJob.id),
        {
          body: JSON.stringify({ serviceAccountId: created.id }),
        }
      );
      upsertJob(payload.job);
      setAttachOpen(false);
      return { created, job: payload.job };
    });
  };

  const onDetach = () => {
    if (!selectedJob) {
      return;
    }
    void run('Detach', async () => {
      const payload = await http.post<{ job: ExampleJob }>(
        jobPath(JOB_DETACH_PATH, selectedJob.id)
      );
      upsertJob(payload.job);
      return payload;
    });
  };

  const onRun = () => {
    if (!selectedJob) {
      return;
    }
    void run('Run as service account', async () => {
      const payload = await http.post<{ job: ExampleJob }>(jobPath(JOB_RUN_PATH, selectedJob.id));
      upsertJob(payload.job);
      return payload;
    });
  };

  const onDelete = () => {
    if (!selectedJob) {
      return;
    }
    void run('Delete job', async () => {
      const payload = await http.delete(jobPath(JOB_PATH, selectedJob.id));
      setJobs((previous) => previous.filter((job) => job.id !== selectedJob.id));
      setSelectedJob(null);
      return payload;
    });
  };

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header pageTitle={APP_TITLE} />
      <EuiPageTemplate.Section>
        <EuiText>
          <p>
            A tiny plugin that owns a workload: create an example job, attach a service account
            once, and run as that account. Security engineers can also list UIAM accounts and
            compare identities after a run.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiTabbedContent
          tabs={[
            {
              id: 'jobs',
              name: 'Example jobs',
              content: (
                <>
                  <EuiSpacer />
                  {selectedJob ? (
                    <JobDetail
                      job={selectedJob}
                      you={you}
                      busy={busy}
                      onBack={() => setSelectedJob(null)}
                      onOpenAttach={() => setAttachOpen(true)}
                      onDetach={onDetach}
                      onRun={onRun}
                      onDelete={onDelete}
                      onViewServiceAccount={setViewedServiceAccountId}
                    />
                  ) : (
                    <JobList
                      jobs={jobs}
                      busy={busy}
                      onSelect={setSelectedJob}
                      onCreate={onCreateJob}
                      onViewServiceAccount={setViewedServiceAccountId}
                    />
                  )}
                </>
              ),
            },
            {
              id: 'accounts',
              name: 'Accounts',
              content: (
                <>
                  <EuiSpacer />
                  <AccountsDirectory coreStart={coreStart} onLogged={run} busy={busy} />
                </>
              ),
            },
          ]}
        />
        {attachOpen && selectedJob && (
          <AttachFlyout
            coreStart={coreStart}
            onClose={() => setAttachOpen(false)}
            onAttach={onAttach}
            onCreateAndAttach={onCreateAndAttach}
            busy={busy !== null}
          />
        )}
        {viewedServiceAccountId && (
          <ServiceAccountFlyout
            http={http}
            serviceAccountId={viewedServiceAccountId}
            onClose={() => setViewedServiceAccountId(null)}
          />
        )}
        <EuiSpacer />
        <EuiTitle size="xs">
          <h2>Inspector</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ApiInspector
          coreStart={coreStart}
          status={status}
          statusError={statusError}
          callLog={callLog}
          onLogged={run}
          busy={busy}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const renderApp = (coreStart: CoreStart, element: AppMountParameters['element']) => {
  const root = createRoot(element);
  root.render(coreStart.rendering.addContext(<ServiceAccountsExampleApp coreStart={coreStart} />));
  return () => root.unmount();
};
