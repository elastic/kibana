/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButton,
  EuiTitle,
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCodeBlock,
  EuiBadge,
  EuiLink,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';

// Initial FEN for a chess starting position
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Workflow names we're looking for
const SIMPLE_WORKFLOW_NAME = 'Simple Wait For Input Test';
const CHESS_WORKFLOW_NAME = 'Chess Game Demo';

// Unicode chess pieces
const PIECES: Record<string, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
};

// Parse FEN to get board array
const fenToBoard = (fen: string): string[][] => {
  const board: string[][] = [];
  const rows = fen.split(' ')[0].split('/');

  for (const row of rows) {
    const boardRow: string[] = [];
    for (const char of row) {
      if (char >= '1' && char <= '8') {
        // Empty squares
        for (let i = 0; i < parseInt(char, 10); i++) {
          boardRow.push('');
        }
      } else {
        boardRow.push(char);
      }
    }
    board.push(boardRow);
  }

  return board;
};

interface Workflow {
  id: string;
  name: string;
  description?: string;
}

interface WorkflowSearchResponse {
  workflows: Workflow[];
  total: number;
}

interface WorkflowExecution {
  id: string;
  status: string;
  stepExecutions?: Array<{
    id: string;
    stepId: string;
    status: string;
    output?: {
      input?: {
        move?: string;
        newBoard?: string;
      };
      timedOut?: boolean;
    };
    state?: {
      message?: string;
      waitingForInputSince?: string;
    };
  }>;
  context?: {
    board?: string;
    lastAiMove?: string;
  };
}

interface ChessGamePageProps {
  http: HttpSetup;
}

// Chess board component
const ChessBoard: React.FC<{ fen: string }> = ({ fen }) => {
  const board = fenToBoard(fen);

  return (
    <div
      style={{
        display: 'inline-block',
        border: '2px solid #333',
        borderRadius: 4,
      }}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex' }}>
          {row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            return (
              <div
                key={colIndex}
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: isLight ? '#f0d9b5' : '#b58863',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  cursor: 'default',
                }}
              >
                {piece && PIECES[piece]}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const ChessGamePage: React.FC<ChessGamePageProps> = ({ http }) => {
  const [simpleWorkflow, setSimpleWorkflow] = useState<Workflow | null>(null);
  const [chessWorkflow, setChessWorkflow] = useState<Workflow | null>(null);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);

  const [executionId, setExecutionId] = useState<string | null>(null);
  const [board, setBoard] = useState(INITIAL_FEN);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastAiMove, setLastAiMove] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [moveInput, setMoveInput] = useState('');
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Search for workflows by name on mount
  useEffect(() => {
    const searchWorkflows = async () => {
      setWorkflowsLoading(true);
      setWorkflowsError(null);

      try {
        // Search for the simple workflow
        const simpleResponse = await http.post<WorkflowSearchResponse>('/api/workflows/search', {
          body: JSON.stringify({
            query: SIMPLE_WORKFLOW_NAME,
            size: 10,
            page: 1,
          }),
        });

        const foundSimple = simpleResponse.workflows.find(
          (w) => w.name === SIMPLE_WORKFLOW_NAME
        );
        if (foundSimple) {
          setSimpleWorkflow(foundSimple);
        }

        // Search for the chess workflow
        const chessResponse = await http.post<WorkflowSearchResponse>('/api/workflows/search', {
          body: JSON.stringify({
            query: CHESS_WORKFLOW_NAME,
            size: 10,
            page: 1,
          }),
        });

        const foundChess = chessResponse.workflows.find(
          (w) => w.name === CHESS_WORKFLOW_NAME
        );
        if (foundChess) {
          setChessWorkflow(foundChess);
        }
      } catch (err: any) {
        setWorkflowsError(err.body?.message || err.message || 'Failed to search workflows');
      } finally {
        setWorkflowsLoading(false);
      }
    };

    searchWorkflows();
  }, [http]);

  // Poll for workflow execution status
  const pollExecution = useCallback(async () => {
    if (!executionId) return;

    try {
      const response = await http.get<WorkflowExecution>(
        `/api/workflowExecutions/${executionId}`
      );
      setExecution(response);

      // Check if workflow is waiting for input
      const waitingStep = response.stepExecutions?.find(
        (step) => step.status === 'waiting_for_input'
      );

      if (waitingStep) {
        setIsMyTurn(true);
        setStatus('waiting_for_input');
        setWaitingMessage(waitingStep.state?.message || null);
      } else if (response.status === 'running') {
        setIsMyTurn(false);
        setStatus('ai_thinking');
        setWaitingMessage(null);
      } else if (response.status === 'completed') {
        setStatus('completed');
        setIsMyTurn(false);
        setWaitingMessage(null);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      } else if (response.status === 'failed') {
        setStatus('failed');
        setError('Workflow failed');
        setIsMyTurn(false);
        setWaitingMessage(null);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      } else if (response.status === 'waiting_for_input') {
        setIsMyTurn(true);
        setStatus('waiting_for_input');
      }

      // Update board from context if available
      if (response.context?.board) {
        setBoard(response.context.board);
      }
      if (response.context?.lastAiMove) {
        setLastAiMove(response.context.lastAiMove);
      }
    } catch (err: any) {
      console.error('Failed to poll execution:', err);
    }
  }, [executionId, http]);

  // Set up polling
  useEffect(() => {
    if (executionId && status !== 'completed' && status !== 'failed') {
      pollIntervalRef.current = setInterval(pollExecution, 2000);
      pollExecution();

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [executionId, status, pollExecution]);

  // Start a game with the simple workflow
  const startSimpleGame = async () => {
    if (!simpleWorkflow) return;

    setError(null);
    setStatus('starting');
    setBoard(INITIAL_FEN);
    setLastAiMove(null);

    try {
      const response = await http.post<{ id: string }>(
        `/api/workflows/${simpleWorkflow.id}/run`,
        {
          body: JSON.stringify({
            inputs: {},
          }),
        }
      );

      setExecutionId(response.id);
      setStatus('running');
    } catch (err: any) {
      setError(err.body?.message || err.message || 'Failed to start workflow');
      setStatus('idle');
    }
  };

  // Start a game with the chess workflow (requires AI connector)
  const startChessGame = async () => {
    if (!chessWorkflow) return;

    setError(null);
    setStatus('starting');
    setBoard(INITIAL_FEN);
    setLastAiMove(null);

    try {
      const response = await http.post<{ id: string }>(
        `/api/workflows/${chessWorkflow.id}/run`,
        {
          body: JSON.stringify({
            inputs: {
              board: INITIAL_FEN,
            },
          }),
        }
      );

      setExecutionId(response.id);
      setStatus('ai_thinking');
    } catch (err: any) {
      setError(err.body?.message || err.message || 'Failed to start game');
      setStatus('idle');
    }
  };

  // Human makes a move / provides input
  const submitInput = async () => {
    if (!executionId || !moveInput.trim()) return;

    setError(null);
    setIsMyTurn(false);
    setStatus('submitting');

    try {
      await http.post(`/api/workflowExecutions/${executionId}/resume`, {
        body: JSON.stringify({
          input: {
            move: moveInput.trim(),
            newBoard: board,
          },
        }),
      });

      setMoveInput('');
      setStatus('running');
    } catch (err: any) {
      setError(err.body?.message || err.message || 'Failed to submit input');
      setIsMyTurn(true);
      setStatus('waiting_for_input');
    }
  };

  // Reset game
  const resetGame = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setExecutionId(null);
    setExecution(null);
    setStatus('idle');
    setBoard(INITIAL_FEN);
    setError(null);
    setLastAiMove(null);
    setWaitingMessage(null);
    setMoveInput('');
  };

  const getStatusColor = () => {
    switch (status) {
      case 'waiting_for_input':
        return 'success';
      case 'ai_thinking':
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Select a workflow to start';
      case 'starting':
        return 'Starting workflow...';
      case 'waiting_for_input':
        return waitingMessage || 'Your turn! Enter your input.';
      case 'ai_thinking':
        return 'AI is thinking...';
      case 'running':
        return 'Workflow running...';
      case 'submitting':
        return 'Submitting your input...';
      case 'completed':
        return 'Workflow completed!';
      case 'failed':
        return 'Workflow failed!';
      default:
        return status;
    }
  };

  const hasWorkflows = simpleWorkflow || chessWorkflow;

  return (
    <EuiFlexGroup style={{ padding: 20 }}>
      <EuiFlexItem grow={2}>
        <EuiPanel>
          <EuiTitle size="m">
            <h2>Human-in-the-Loop Demo</h2>
          </EuiTitle>
          <EuiSpacer size="m" />

          {workflowsLoading ? (
            <EuiCallOut title="Loading workflows..." color="primary">
              <EuiLoadingSpinner size="s" />
            </EuiCallOut>
          ) : workflowsError ? (
            <EuiCallOut title="Error loading workflows" color="danger" iconType="alert">
              {workflowsError}
            </EuiCallOut>
          ) : !hasWorkflows ? (
            <EuiCallOut
              title="Workflows Not Found"
              color="warning"
              iconType="help"
            >
              <p>
                The required workflows were not found. Please create them first:
              </p>
              <ul>
                <li>
                  <strong>{SIMPLE_WORKFLOW_NAME}</strong> - For basic human-in-the-loop testing
                </li>
                <li>
                  <strong>{CHESS_WORKFLOW_NAME}</strong> - For chess game with AI (requires AI connector)
                </li>
              </ul>
              <p>
                You can find the YAML files in{' '}
                <code>examples/chess_workflow_example/workflows/</code>
              </p>
              <EuiSpacer size="s" />
              <EuiLink href="/app/workflows" target="_blank">
                Go to Workflows Management
              </EuiLink>
            </EuiCallOut>
          ) : (
            <>
              <EuiCallOut
                title={getStatusText()}
                color={getStatusColor()}
                iconType={
                  status === 'ai_thinking' || status === 'running'
                    ? 'clock'
                    : isMyTurn
                    ? 'user'
                    : 'compute'
                }
              >
                {(status === 'ai_thinking' || status === 'running' || status === 'starting') && (
                  <EuiLoadingSpinner size="s" />
                )}
              </EuiCallOut>

              <EuiSpacer size="m" />

              {error && (
                <>
                  <EuiCallOut title="Error" color="danger" iconType="alert">
                    {error}
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}

              {/* Chess Board */}
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <ChessBoard fen={board} />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              {!executionId ? (
                <>
                  <EuiText size="s">
                    <p>Choose a workflow to start:</p>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup gutterSize="s">
                    {simpleWorkflow && (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          onClick={startSimpleGame}
                          isLoading={status === 'starting'}
                        >
                          Start Simple Test
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                    {chessWorkflow && (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          fill
                          onClick={startChessGame}
                          isLoading={status === 'starting'}
                        >
                          Start Chess Game (AI)
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  {!simpleWorkflow && (
                    <EuiText size="xs" color="subdued">
                      <p>Simple workflow not found - create &quot;{SIMPLE_WORKFLOW_NAME}&quot;</p>
                    </EuiText>
                  )}
                  {!chessWorkflow && (
                    <EuiText size="xs" color="subdued">
                      <p>Chess workflow not found - create &quot;{CHESS_WORKFLOW_NAME}&quot;</p>
                    </EuiText>
                  )}
                </>
              ) : (
                <>
                  {lastAiMove && (
                    <EuiText>
                      <p>
                        <strong>AI&apos;s last move:</strong>{' '}
                        <EuiBadge color="primary">{lastAiMove}</EuiBadge>
                      </p>
                    </EuiText>
                  )}

                  <EuiSpacer size="m" />

                  {isMyTurn && (
                    <>
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <input
                            type="text"
                            className="euiFieldText"
                            placeholder="Enter your input (e.g., e2e4)"
                            value={moveInput}
                            onChange={(e) => setMoveInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') submitInput();
                            }}
                            style={{ width: 200 }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            fill
                            onClick={submitInput}
                            disabled={!moveInput.trim()}
                            isLoading={status === 'submitting'}
                          >
                            Submit
                          </EuiButton>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton onClick={resetGame} color="text">
                            Reset
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </>
                  )}

                  {!isMyTurn && (status === 'completed' || status === 'failed') && (
                    <EuiButton onClick={resetGame} color="primary">
                      Start New
                    </EuiButton>
                  )}

                  {!isMyTurn && status !== 'completed' && status !== 'failed' && (
                    <EuiButton onClick={resetGame} color="text">
                      Cancel
                    </EuiButton>
                  )}
                </>
              )}
            </>
          )}
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiPanel>
          <EuiTitle size="s">
            <h3>Workflow Status</h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <EuiText size="s">
            <p>
              <strong>Available Workflows:</strong>
            </p>
          </EuiText>
          <EuiSpacer size="xs" />
          {workflowsLoading ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            <>
              <div style={{ marginBottom: 4 }}>
                <EuiBadge color={simpleWorkflow ? 'success' : 'default'}>
                  {SIMPLE_WORKFLOW_NAME}: {simpleWorkflow ? 'Found' : 'Not Found'}
                </EuiBadge>
              </div>
              <div>
                <EuiBadge color={chessWorkflow ? 'success' : 'default'}>
                  {CHESS_WORKFLOW_NAME}: {chessWorkflow ? 'Found' : 'Not Found'}
                </EuiBadge>
              </div>
            </>
          )}

          <EuiSpacer size="m" />

          {executionId ? (
            <>
              <EuiText size="s">
                <p>
                  <strong>Execution ID:</strong>
                </p>
              </EuiText>
              <EuiCodeBlock fontSize="s" paddingSize="s" isCopyable>
                {executionId}
              </EuiCodeBlock>

              <EuiSpacer size="s" />

              <EuiText size="s">
                <p>
                  <strong>Status:</strong>{' '}
                  <EuiBadge color={getStatusColor()}>{execution?.status || status}</EuiBadge>
                </p>
              </EuiText>

              <EuiSpacer size="s" />

              {execution?.stepExecutions && execution.stepExecutions.length > 0 && (
                <>
                  <EuiText size="s">
                    <p>
                      <strong>Steps:</strong>
                    </p>
                  </EuiText>
                  {execution.stepExecutions.map((step) => (
                    <div key={step.id} style={{ marginBottom: 4 }}>
                      <EuiBadge
                        color={
                          step.status === 'completed'
                            ? 'success'
                            : step.status === 'waiting_for_input'
                            ? 'warning'
                            : step.status === 'running'
                            ? 'primary'
                            : 'default'
                        }
                      >
                        {step.stepId}: {step.status}
                      </EuiBadge>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <EuiText size="s" color="subdued">
              <p>Start a workflow to see execution details.</p>
            </EuiText>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
