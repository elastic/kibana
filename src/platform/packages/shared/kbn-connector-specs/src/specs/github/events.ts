/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import type { ConnectorSpecEvents } from '../../connector_spec_events';
import { buildEventId } from '../../event_type_id';
import { MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH } from '../../handle_events_result';
import {
  GithubIssuesEventSchema,
  GithubIssueCommentEventSchema,
  GithubPullRequestEventSchema,
  GithubPullRequestReviewEventSchema,
  GithubPushEventSchema,
  GithubReleaseEventSchema,
  GithubDeploymentStatusEventSchema,
  GithubCheckRunEventSchema,
} from './event_schemas';

const DeliveryHeadersSchema = lazySchema(() =>
  z.object({
    'x-github-event': z.string().min(1).max(256),
    'x-github-delivery': z.string().min(1).max(MAX_HANDLE_EVENTS_CORRELATION_KEY_LENGTH).optional(),
  })
);

const definitions = {
  issues: {
    eventId: buildEventId('.github', 'issues'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.issues.title', {
      defaultMessage: 'Issue',
    }),
    description: i18n.translate('core.kibanaConnectorSpecs.github.events.issues.description', {
      defaultMessage:
        'An issue was opened, edited, reopened, closed, or otherwise changed. Filter with event.body.action.',
    }),
    eventSchema: GithubIssuesEventSchema,
  },
  issue_comment: {
    eventId: buildEventId('.github', 'issue_comment'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.issueComment.title', {
      defaultMessage: 'Issue comment',
    }),
    description: i18n.translate(
      'core.kibanaConnectorSpecs.github.events.issueComment.description',
      {
        defaultMessage:
          'An issue or pull request comment was created, edited, or deleted. Filter with event.body.action.',
      }
    ),
    eventSchema: GithubIssueCommentEventSchema,
  },
  pull_request: {
    eventId: buildEventId('.github', 'pull_request'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.pullRequest.title', {
      defaultMessage: 'Pull request',
    }),
    description: i18n.translate('core.kibanaConnectorSpecs.github.events.pullRequest.description', {
      defaultMessage:
        'A pull request was opened, updated, reopened, or closed. Filter with event.body.action; updates use edited or synchronize. Check event.body.pull_request.merged to distinguish a merge from an unmerged close.',
    }),
    eventSchema: GithubPullRequestEventSchema,
  },
  pull_request_review: {
    eventId: buildEventId('.github', 'pull_request_review'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.pullRequestReview.title', {
      defaultMessage: 'Pull request review submitted',
    }),
    description: i18n.translate(
      'core.kibanaConnectorSpecs.github.events.pullRequestReview.description',
      {
        defaultMessage:
          'A pull request review was submitted. The review state is available in event.body.review.state.',
      }
    ),
    eventSchema: GithubPullRequestReviewEventSchema,
  },
  push: {
    eventId: buildEventId('.github', 'push'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.push.title', {
      defaultMessage: 'Push received',
    }),
    description: i18n.translate('core.kibanaConnectorSpecs.github.events.push.description', {
      defaultMessage:
        'Commits, a branch, or a tag were pushed. The ref and before and after commit IDs are available in the event body.',
    }),
    eventSchema: GithubPushEventSchema,
  },
  release: {
    eventId: buildEventId('.github', 'release'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.release.title', {
      defaultMessage: 'Release published',
    }),
    description: i18n.translate('core.kibanaConnectorSpecs.github.events.release.description', {
      defaultMessage:
        'A release was published. The tag, release ID, and prerelease flag are available in event.body.release.',
    }),
    eventSchema: GithubReleaseEventSchema,
  },
  deployment_status: {
    eventId: buildEventId('.github', 'deployment_status'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.deploymentStatus.title', {
      defaultMessage: 'Deployment status changed',
    }),
    description: i18n.translate(
      'core.kibanaConnectorSpecs.github.events.deploymentStatus.description',
      {
        defaultMessage:
          'A deployment status changed. Filter with event.body.deployment_status.state to select an outcome.',
      }
    ),
    eventSchema: GithubDeploymentStatusEventSchema,
  },
  check_run: {
    eventId: buildEventId('.github', 'check_run'),
    title: i18n.translate('core.kibanaConnectorSpecs.github.events.checkRun.title', {
      defaultMessage: 'Check run completed',
    }),
    description: i18n.translate('core.kibanaConnectorSpecs.github.events.checkRun.description', {
      defaultMessage:
        'A check run completed. Filter with event.body.check_run.conclusion to select success, failure, or another outcome.',
    }),
    eventSchema: GithubCheckRunEventSchema,
  },
};

const requiredActions: Readonly<Record<string, string>> = {
  pull_request_review: 'submitted',
  release: 'published',
  check_run: 'completed',
};

export const githubEvents: ConnectorSpecEvents = {
  definitions,
  async handleEvents({ headers, rawBody }) {
    const delivery = DeliveryHeadersSchema.safeParse(headers);
    if (!delivery.success) {
      return { type: 'emit', events: [] };
    }

    const { 'x-github-event': eventType, 'x-github-delivery': deliveryId } = delivery.data;
    const definition = Object.values(definitions).find(
      ({ eventId }) => eventId === buildEventId('.github', eventType)
    );
    if (!definition) {
      return { type: 'emit', events: [] };
    }

    const parsed = definition.eventSchema.safeParse({ eventType, body: rawBody });
    if (!parsed.success) {
      return { type: 'emit', events: [] };
    }

    const requiredAction = requiredActions[eventType];
    if (requiredAction !== undefined && parsed.data.body.action !== requiredAction) {
      return { type: 'emit', events: [] };
    }

    return {
      type: 'emit',
      events: [
        {
          eventId: definition.eventId,
          correlationKey: deliveryId ?? uuidv4(),
          payload: parsed.data,
        },
      ],
    };
  },
};
