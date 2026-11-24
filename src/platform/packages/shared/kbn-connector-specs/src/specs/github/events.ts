/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  githubCheckRun,
  githubDeploymentStatus,
  githubIssueComment,
  githubIssues,
  githubPullRequest,
  githubPullRequestReview,
  githubPush,
  githubRelease,
} from '@kbn/connector-topics';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import { toConnectorSpecEvent, type ConnectorSpecEvents } from '../../connector_spec_events';
import { MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH } from '../../handle_events_result';

const DeliveryHeadersSchema = lazySchema(() =>
  z.object({
    'x-github-event': z.string().min(1).max(256),
    'x-github-delivery': z.string().min(1).max(MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH).optional(),
  })
);

const definitions = {
  issues: toConnectorSpecEvent(githubIssues, {
    title: i18n.translate('connectorSpecs.github.events.issues.title', {
      defaultMessage: 'Issue',
    }),
    description: i18n.translate('connectorSpecs.github.events.issues.description', {
      defaultMessage:
        'An issue was opened, edited, reopened, closed, or otherwise changed. Filter with event.body.action.',
    }),
  }),
  issue_comment: toConnectorSpecEvent(githubIssueComment, {
    title: i18n.translate('connectorSpecs.github.events.issueComment.title', {
      defaultMessage: 'Issue comment',
    }),
    description: i18n.translate('connectorSpecs.github.events.issueComment.description', {
      defaultMessage:
        'An issue or pull request comment was created, edited, or deleted. Filter with event.body.action.',
    }),
  }),
  pull_request: toConnectorSpecEvent(githubPullRequest, {
    title: i18n.translate('connectorSpecs.github.events.pullRequest.title', {
      defaultMessage: 'Pull request',
    }),
    description: i18n.translate('connectorSpecs.github.events.pullRequest.description', {
      defaultMessage:
        'A pull request was opened, updated, reopened, or closed. Filter with event.body.action; updates use edited or synchronize. Check event.body.pull_request.merged to distinguish a merge from an unmerged close.',
    }),
  }),
  pull_request_review: toConnectorSpecEvent(githubPullRequestReview, {
    title: i18n.translate('connectorSpecs.github.events.pullRequestReview.title', {
      defaultMessage: 'Pull request review submitted',
    }),
    description: i18n.translate('connectorSpecs.github.events.pullRequestReview.description', {
      defaultMessage:
        'A pull request review was submitted. The review state is available in event.body.review.state.',
    }),
  }),
  push: toConnectorSpecEvent(githubPush, {
    title: i18n.translate('connectorSpecs.github.events.push.title', {
      defaultMessage: 'Push received',
    }),
    description: i18n.translate('connectorSpecs.github.events.push.description', {
      defaultMessage:
        'Commits, a branch, or a tag were pushed. The ref and before and after commit IDs are available in the event body.',
    }),
  }),
  release: toConnectorSpecEvent(githubRelease, {
    title: i18n.translate('connectorSpecs.github.events.release.title', {
      defaultMessage: 'Release published',
    }),
    description: i18n.translate('connectorSpecs.github.events.release.description', {
      defaultMessage:
        'A release was published. The tag, release ID, and prerelease flag are available in event.body.release.',
    }),
  }),
  deployment_status: toConnectorSpecEvent(githubDeploymentStatus, {
    title: i18n.translate('connectorSpecs.github.events.deploymentStatus.title', {
      defaultMessage: 'Deployment status changed',
    }),
    description: i18n.translate('connectorSpecs.github.events.deploymentStatus.description', {
      defaultMessage:
        'A deployment status changed. Filter with event.body.deployment_status.state to select an outcome.',
    }),
  }),
  check_run: toConnectorSpecEvent(githubCheckRun, {
    title: i18n.translate('connectorSpecs.github.events.checkRun.title', {
      defaultMessage: 'Check run completed',
    }),
    description: i18n.translate('connectorSpecs.github.events.checkRun.description', {
      defaultMessage:
        'A check run completed. Filter with event.body.check_run.conclusion to select success, failure, or another outcome.',
    }),
  }),
};

type GithubEventType = keyof typeof definitions;

const requiredActions: Partial<Record<GithubEventType, string>> = {
  pull_request_review: 'submitted',
  release: 'published',
  check_run: 'completed',
};

const isGithubEventType = (eventType: string): eventType is GithubEventType =>
  Object.hasOwn(definitions, eventType);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Form-encoded webhooks (GitHub's API default) send the event JSON as a `payload` string.
const toDeliveryBody = (rawBody: unknown): Record<string, unknown> | undefined => {
  if (!isPlainObject(rawBody)) {
    return undefined;
  }
  const { payload } = rawBody;
  if (typeof payload !== 'string') {
    return rawBody;
  }
  try {
    const parsed: unknown = JSON.parse(payload);
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const githubEvents: ConnectorSpecEvents = {
  definitions,
  headers: ['x-github-event', 'x-github-delivery'],
  async handleEvents({ headers, rawBody }) {
    const delivery = DeliveryHeadersSchema.safeParse(headers);
    const body = toDeliveryBody(rawBody);
    if (!delivery.success || body === undefined) {
      return { type: 'emit', events: [] };
    }

    const { 'x-github-event': eventType, 'x-github-delivery': deliveryId } = delivery.data;
    if (!isGithubEventType(eventType)) {
      return { type: 'emit', events: [] };
    }

    const requiredAction = requiredActions[eventType];
    if (requiredAction !== undefined && body.action !== requiredAction) {
      return { type: 'emit', events: [] };
    }

    return {
      type: 'emit',
      events: [
        {
          eventId: definitions[eventType].eventId,
          correlationKey: deliveryId ?? uuidv4(),
          payload: { eventType, body },
        },
      ],
    };
  },
};
