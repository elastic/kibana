# External Resume Security Model

This document describes the security model for Human-in-the-Loop (HITL) external resume links: URLs sent through Slack, email, and other channels that allow an external actor to approve a paused workflow step or submit structured input without a Kibana session.

The model applies to both HITL step types:

- `waitForApproval` - approve/reject links.
- `waitForInput` - query-param resume and HTML form submission.

## Architecture

External resume routes are public Kibana routes. They do not use Kibana session authentication; instead, the workflow step stores a short-lived random token hash while it is waiting.

The URL contains:

- `executionId` in the path.
- `stepId` in the path. This is the step execution id, so the server can load the step execution directly.
- `token` in the query string. This is a 256-bit random nonce and is not an Elasticsearch credential.

Example:

```text
GET /api/workflows/executions/{executionId}/steps/{stepId}/resume/external?token={nonce}&approved=true
```

When the step enters `WAITING_FOR_INPUT`, Kibana:

1. Generates `token = randomBytes(32).toString('hex')`.
2. Computes `HMAC-SHA-256(key=token, data=executionId|stepExecutionId|expiresAt)` and stores the result on the step execution input as `_hitlTokenHash`. Binding `executionId`, `stepExecutionId`, and `expiresAt` into the HMAC prevents index-level tampering (e.g. extending TTL or moving the token to another step execution).
3. Stores the token expiry timestamp on the step execution input as `_hitlTokenExpiresAt`.
4. Builds external links with `executionId`, `stepId`, and the raw `token`.
5. Discards the raw token after sending notifications.

No Elasticsearch API key is created for external resume, and no Elasticsearch credential is placed in URLs, logs, browser history, Slack, or email.

## Validation

On resume, Kibana:

1. Loads the addressed step execution by `executionId`, `stepId`, and `spaceId`.
2. Verifies the step is a waiting HITL step and has not finished or errored.
3. Verifies `_hitlTokenExpiresAt` is still in the future.
4. Recomputes `HMAC-SHA-256(key=token, data=executionId|stepExecutionId|expiresAt)` using the request's `executionId` and `stepId` plus the stored `expiresAt`, and compares the result to `_hitlTokenHash` with `timingSafeEqual`.
5. Claims the step via `markStepAsResponded`, which removes `_hitlTokenHash` and `_hitlTokenExpiresAt` before scheduling resume.
6. Resumes the workflow with the original workflow runner permissions.

The token is single-use because the atomic step claim removes the stored token metadata and prevents subsequent submissions from winning after the first accepted response. Timeout and cancellation paths also remove the stored token metadata from the step input. Expiry is enforced by the stored timestamp and by the normal HITL timeout behavior.

## Threat Model

| Threat | Mitigation |
|--------|------------|
| URL leaked in server logs, proxy logs, browser history, Slack, or email | The URL contains only a random nonce, not an ES credential. Exposure is bounded by expiry and first-use claim. |
| Attacker has `executionId` and `stepId` only | Cannot resume without the 256-bit token. |
| Attacker has workflow index read access | Sees only the HMAC and expiry, not the raw token. |
| Attacker replays a valid URL after use | `markStepAsResponded` removes token metadata and rejects later attempts. |
| Attacker uses a valid token after timeout | `_hitlTokenExpiresAt` rejects expired links; timeout cleanup removes the stored token metadata. |
| Attacker crafts a link for another step | The HMAC binds `executionId` and `stepExecutionId`; using the token against a different step produces an HMAC mismatch. |
| Attacker with index write access extends TTL | The HMAC binds `expiresAt`; modifying the stored expiry invalidates the signature. |
| Attacker with index write access moves token to another step | The HMAC binds `executionId` and `stepExecutionId`; copying the hash to a different step execution invalidates the signature. |

The workflow resumes using the original invoker's workflow runner permissions, not permissions from the external actor. The external token only authorizes the waiting step to be claimed and resumed.
