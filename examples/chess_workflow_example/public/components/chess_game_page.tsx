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
import { Chess, type Square } from 'chess.js';

// Initial FEN for a chess starting position
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Workflow name we're looking for
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

// Convert row/col to algebraic notation (e.g., 0,0 -> a8)
const toSquare = (row: number, col: number): Square => {
  const files = 'abcdefgh';
  const ranks = '87654321';
  return `${files[col]}${ranks[row]}` as Square;
};

interface Workflow {
  id: string;
  name: string;
  description?: string;
}

interface WorkflowSearchResponse {
  results: Workflow[];
  total: number;
  page: number;
  size: number;
}

interface WorkflowExecution {
  id: string;
  status: string;
  stepExecutions?: Array<{
    id: string;
    stepId: string;
    status: string;
    // Output from the step - for data.set steps this contains the variables
    // For waitForInput steps, this contains the human input after resume
    output?: Record<string, unknown> | null;
    state?: {
      message?: string;
      waitingForInputSince?: string;
      timeoutAt?: string;
    };
  }>;
  context?: {
    board?: string;
    lastAiMove?: string;
    aiReasoning?: string;
    gameOver?: boolean;
    winner?: string;
    endReason?: string;
  };
}

interface ChessGamePageProps {
  http: HttpSetup;
}

// Chess board component with click-to-move
const ChessBoard: React.FC<{
  game: Chess;
  selectedSquare: Square | null;
  validMoves: Square[];
  onSquareClick: (square: Square) => void;
  disabled: boolean;
  lastAiMove: string | null;
}> = ({ game, selectedSquare, validMoves, onSquareClick, disabled, lastAiMove }) => {
  const board = game.board();

  // Parse last AI move to highlight squares
  const aiMoveFrom = lastAiMove ? (lastAiMove.slice(0, 2) as Square) : null;
  const aiMoveTo = lastAiMove ? (lastAiMove.slice(2, 4) as Square) : null;

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
          {row.map((square, colIndex) => {
            const squareName = toSquare(rowIndex, colIndex);
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selectedSquare === squareName;
            const isValidMove = validMoves.includes(squareName);
            const isAiMoveFrom = aiMoveFrom === squareName;
            const isAiMoveTo = aiMoveTo === squareName;
            const piece = square?.type;
            const pieceColor = square?.color;

            // Determine background color
            let backgroundColor = isLight ? '#f0d9b5' : '#b58863';
            if (isSelected) {
              backgroundColor = '#7fc97f'; // Green for selected
            } else if (isValidMove) {
              backgroundColor = isLight ? '#afd9a5' : '#8db883'; // Light green for valid moves
            } else if (isAiMoveFrom || isAiMoveTo) {
              backgroundColor = isLight ? '#f7ec7d' : '#dac34b'; // Yellow for AI's last move
            }

            // Can click on own pieces (black for human) or valid move squares
            const isClickable =
              !disabled && ((piece && pieceColor === 'b') || (selectedSquare && isValidMove));

            return (
              <div
                key={colIndex}
                onClick={() => !disabled && onSquareClick(squareName)}
                style={{
                  width: 55,
                  height: 55,
                  backgroundColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  cursor: isClickable ? 'pointer' : 'default',
                  position: 'relative',
                  userSelect: 'none',
                }}
              >
                {piece && PIECES[pieceColor === 'w' ? piece.toUpperCase() : piece]}
                {isValidMove && !piece && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
      {/* File labels */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '2px 0' }}>
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => (
          <span key={file} style={{ width: 55, textAlign: 'center', fontSize: 12, color: '#666' }}>
            {file}
          </span>
        ))}
      </div>
    </div>
  );
};

export const ChessGamePage: React.FC<ChessGamePageProps> = ({ http }) => {
  const [chessWorkflow, setChessWorkflow] = useState<Workflow | null>(null);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);

  const [executionId, setExecutionId] = useState<string | null>(null);
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastAiMove, setLastAiMove] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
  const [lastResumeInfo, setLastResumeInfo] = useState<{
    timestamp: string;
    move: string;
    success: boolean;
    error?: string;
  } | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenAiMoveRef = useRef<string | null>(null);
  const lastSeenAiMoveCountRef = useRef<number>(0);

  // Search for workflows by name on mount
  useEffect(() => {
    const searchWorkflows = async () => {
      setWorkflowsLoading(true);
      setWorkflowsError(null);

      try {
        const chessResponse = await http.post<WorkflowSearchResponse>('/api/workflows/search', {
          body: JSON.stringify({
            query: CHESS_WORKFLOW_NAME,
            size: 10,
            page: 1,
          }),
        });

        const foundChess = chessResponse.results?.find((w) => w.name === CHESS_WORKFLOW_NAME);
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
      console.log('Poll response FULL:', JSON.stringify(response, null, 2));
      console.log('Poll response:', {
        status: response.status,
        stepExecutions: response.stepExecutions?.map((s) => ({
          stepId: s.stepId,
          status: s.status,
        })),
        context: response.context,
        contextKeys: response.context ? Object.keys(response.context) : [],
      });
      setExecution(response);

      // Check workflow-level status
      if (response.status === 'waiting_for_input') {
        console.log('Setting isMyTurn = true (status is waiting_for_input)');
        setIsMyTurn(true);
        setStatus('waiting_for_input');
        
        // Extract turn number from the latest store_ai_move step
        const aiMoveSteps = response.stepExecutions?.filter(
          (step) => step.stepId?.includes('store_ai_move') && step.status === 'completed'
        ) || [];
        let computedTurnNumber = 1;
        if (aiMoveSteps.length > 0) {
          const latestAiStep = aiMoveSteps[aiMoveSteps.length - 1];
          const tn = (latestAiStep.output as any)?.turnNumber;
          if (tn) {
            computedTurnNumber = parseInt(tn, 10) || aiMoveSteps.length;
          } else {
            computedTurnNumber = aiMoveSteps.length;
          }
        }
        setTurnNumber(computedTurnNumber);
        setWaitingMessage(`Turn ${computedTurnNumber}: Your move (you are Black)!`);
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
      }

      // Update board from step outputs
      // Variables from data.set steps are stored as step outputs in stepExecutions
      // We need to find the LATEST step that has a 'board' property in its output
      // Steps are processed in order, so the last one with 'board' is the most recent state
      const getLatestBoardState = () => {
        // Get all completed data.set steps that have outputs
        const dataSetSteps = response.stepExecutions
          ?.filter((step) => step.stepId?.includes('store_') || step.stepId?.includes('init_'))
          .filter((step) => step.status === 'completed' && step.output) || [];
        
        // Log the order of steps with their board values for debugging
        console.log('Data.set steps in order:', dataSetSteps.map((s, idx) => ({
          idx,
          stepId: s.stepId,
          board: (s.output as any)?.board,
          id: s.id
        })));
        
        // Find the last step that has a 'board' property - this is the most recent state
        let latestBoard: string | null = null;
        let latestAiMove: string | null = null;
        let latestAiReasoning: string | null = null;
        
        // Count AI moves to detect new ones
        let aiMoveCount = 0;
        const aiMoves: string[] = [];
        
        // Process in order (first to last), last write wins
        dataSetSteps.forEach((step, idx) => {
          const output = step.output as Record<string, unknown>;
          if (output.board && typeof output.board === 'string') {
            console.log(`Step ${idx} (${step.stepId}) sets board to:`, output.board);
            latestBoard = output.board;
          }
          // Check for AI move - workflow stores it as 'lastMove' with 'lastMoveBy' === 'AI'
          // Also check for 'lastAiMove' for backwards compatibility
          const moveValue = output.lastAiMove || output.lastMove;
          const isAiMove = output.lastMoveBy === 'AI' || step.stepId?.includes('store_ai_move');
          if (moveValue && typeof moveValue === 'string' && isAiMove) {
            // Only count as new AI move if it's from store_ai_move step
            if (step.stepId?.includes('store_ai_move')) {
              aiMoveCount++;
              aiMoves.push(moveValue);
              console.log(`Step ${idx} (${step.stepId}) AI move:`, moveValue);
            }
            latestAiMove = moveValue;
          }
          if (output.aiReasoning && typeof output.aiReasoning === 'string') {
            latestAiReasoning = output.aiReasoning;
          }
        });
        
        console.log('AI moves found:', { aiMoveCount, aiMoves });
        
        return { 
          board: latestBoard, 
          lastAiMove: latestAiMove, 
          aiReasoning: latestAiReasoning,
          aiMoveCount,
          aiMoves
        };
      };

      const latestState = getLatestBoardState();
      console.log('Final latest state:', latestState);
      
      const boardFen = latestState.board || response.context?.board;
      const newAiMove = latestState.lastAiMove || response.context?.lastAiMove;
      const aiMoveCount = latestState.aiMoveCount || 0;
      
      // Detect if we have a new AI move
      const hasNewAiMove = aiMoveCount > lastSeenAiMoveCountRef.current;
      
      console.log('AI move check:', { 
        newAiMove, 
        aiMoveCount,
        lastSeenCount: lastSeenAiMoveCountRef.current, 
        hasNewAiMove 
      });
      
      // Only sync the board from workflow when we have a NEW AI move
      // Do NOT sync during waiting_for_input because that would revert the human's
      // local move before it's submitted to the workflow
      if ((hasNewAiMove || lastSeenAiMoveCountRef.current === 0) && boardFen && typeof boardFen === 'string') {
        console.log('Syncing board - new AI move detected');
        
        // IMPORTANT: Instead of trusting the LLM's FEN (which can have wrong piece colors),
        // we apply the AI's move to our local board state
        const aiMove = newAiMove || latestState.lastAiMove || latestState.lastMove;
        
        if (aiMove && typeof aiMove === 'string' && aiMove.length >= 4) {
          // Try to apply the AI's move to our local board
          const gameCopy = new Chess(game.fen());
          const from = aiMove.slice(0, 2);
          const to = aiMove.slice(2, 4);
          const promotion = aiMove.length > 4 ? aiMove[4] : undefined;
          
          try {
            const moveResult = gameCopy.move({ from, to, promotion });
            if (moveResult) {
              console.log('Applied AI move locally:', aiMove, 'New FEN:', gameCopy.fen());
              setGame(gameCopy);
            } else {
              // Move failed - fall back to workflow FEN but log warning
              console.warn('Could not apply AI move locally, falling back to workflow FEN');
              console.warn('AI move:', aiMove, 'Current board:', game.fen());
              const newGame = new Chess();
              newGame.load(boardFen);
              setGame(newGame);
            }
          } catch (moveError) {
            console.error('Error applying AI move:', moveError);
            // Fall back to workflow FEN
            const newGame = new Chess();
            try {
              newGame.load(boardFen);
              setGame(newGame);
            } catch (fenError) {
              console.error('Invalid FEN from workflow:', boardFen, fenError);
            }
          }
        } else {
          // No AI move available, use workflow FEN (e.g., initial game setup)
          console.log('No AI move to apply, using workflow FEN:', boardFen);
          const newGame = new Chess();
          try {
            newGame.load(boardFen);
            setGame(newGame);
          } catch (fenError) {
            console.error('Invalid FEN from workflow:', boardFen, fenError);
          }
        }
        
        // Update our count of seen AI moves
        if (hasNewAiMove) {
          lastSeenAiMoveCountRef.current = aiMoveCount;
        }
      } else {
        console.log('Skipping board sync - no new AI move');
      }
      
      if (newAiMove && typeof newAiMove === 'string') {
        lastSeenAiMoveRef.current = newAiMove;
        setLastAiMove(newAiMove);
      }
      
      const reasoning = latestState.aiReasoning || response.context?.aiReasoning;
      if (reasoning && typeof reasoning === 'string') {
        setAiReasoning(reasoning);
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

  // Start a new chess game
  const startChessGame = async () => {
    if (!chessWorkflow) return;

    setError(null);
    setStatus('starting');
    const newGame = new Chess();
    setGame(newGame);
    setLastAiMove(null);
    lastSeenAiMoveRef.current = null; // Reset the ref
    lastSeenAiMoveCountRef.current = 0; // Reset the count
    setAiReasoning(null);
    setSelectedSquare(null);
    setValidMoves([]);

    try {
      const response = await http.post<{ workflowExecutionId: string }>(
        `/api/workflows/${chessWorkflow.id}/run`,
        {
          body: JSON.stringify({
            inputs: {
              board: INITIAL_FEN,
            },
          }),
        }
      );

      setExecutionId(response.workflowExecutionId);
      setStatus('ai_thinking');
    } catch (err: any) {
      setError(err.body?.message || err.message || 'Failed to start game');
      setStatus('idle');
    }
  };

  // Handle square click
  const handleSquareClick = (square: Square) => {
    console.log('Square clicked:', square, {
      isMyTurn,
      executionId,
      status,
      selectedSquare,
      validMoves,
    });

    if (!isMyTurn || !executionId) {
      console.log('Click ignored - isMyTurn:', isMyTurn, 'executionId:', executionId);
      return;
    }

    const piece = game.get(square);

    // If clicking on own piece (black), select it
    if (piece && piece.color === 'b') {
      setSelectedSquare(square);
      // Get valid moves for this piece
      const moves = game.moves({ square, verbose: true });
      setValidMoves(moves.map((m) => m.to as Square));
      return;
    }

    // If a piece is selected and clicking on a valid move square
    if (selectedSquare && validMoves.includes(square)) {
      makeMove(selectedSquare, square);
      return;
    }

    // Clear selection
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Make a move
  const makeMove = async (from: Square, to: Square) => {
    const gameCopy = new Chess(game.fen());

    try {
      const move = gameCopy.move({
        from,
        to,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move === null) return;

      // Update local game state
      setGame(gameCopy);
      setSelectedSquare(null);
      setValidMoves([]);
      setIsMyTurn(false);
      setStatus('submitting');

      // Check game status
      const isCheckmate = gameCopy.isCheckmate();
      const isStalemate = gameCopy.isStalemate();
      const isDraw = gameCopy.isDraw();
      const gameOver = isCheckmate || isStalemate || isDraw;

      // Send move to workflow
      const moveStr = `${from}${to}`;
      console.log('Submitting move to workflow:', moveStr, 'FEN:', gameCopy.fen());
      
      try {
        await http.post(`/api/workflowExecutions/${executionId}/resume`, {
          body: JSON.stringify({
            input: {
              move: moveStr,
              newBoard: gameCopy.fen(),
              gameOver,
              winner: isCheckmate ? 'Human' : undefined,
              endReason: isCheckmate
                ? 'checkmate'
                : isStalemate
                ? 'stalemate'
                : isDraw
                ? 'draw'
                : undefined,
            },
          }),
        });
        
        console.log('Resume API call successful for move:', moveStr);
        setLastResumeInfo({
          timestamp: new Date().toISOString(),
          move: moveStr,
          success: true,
        });
        setStatus('ai_thinking');
      } catch (resumeErr: any) {
        console.error('Resume API call failed:', resumeErr);
        setLastResumeInfo({
          timestamp: new Date().toISOString(),
          move: moveStr,
          success: false,
          error: resumeErr.body?.message || resumeErr.message || 'Unknown error',
        });
        throw resumeErr; // Re-throw to be caught by outer catch
      }
    } catch (err: any) {
      console.error('Failed to submit move:', err);
      const errorMessage = err.body?.message || err.message || 'Failed to submit move';
      setError(`Move submission error: ${errorMessage}`);
      setIsMyTurn(true);
      setStatus('waiting_for_input');
      // Revert the move
      setGame(new Chess(game.fen()));
    }
  };

  // Resign the game
  const resignGame = async () => {
    if (!executionId) return;

    setIsMyTurn(false);
    setStatus('submitting');

    try {
      await http.post(`/api/workflowExecutions/${executionId}/resume`, {
        body: JSON.stringify({
          input: {
            move: 'resign',
            newBoard: game.fen(),
            gameOver: true,
            winner: 'AI',
            endReason: 'resignation',
          },
        }),
      });
      setStatus('completed');
    } catch (err: any) {
      setError(err.body?.message || err.message || 'Failed to resign');
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
    setGame(new Chess());
    setError(null);
    setLastAiMove(null);
    lastSeenAiMoveRef.current = null; // Reset the ref
    lastSeenAiMoveCountRef.current = 0; // Reset the count
    setAiReasoning(null);
    setWaitingMessage(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastResumeInfo(null); // Reset resume tracking
    setTurnNumber(1); // Reset turn number
  };

  const getStatusColor = (): 'primary' | 'success' | 'warning' | 'danger' | 'accent' => {
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
        return 'primary';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Click "Start Chess Game" to begin';
      case 'starting':
        return 'Starting game...';
      case 'waiting_for_input':
        return waitingMessage || 'Your turn! Click a black piece to select, then click destination.';
      case 'ai_thinking':
        return 'AI is thinking...';
      case 'running':
        return 'Processing...';
      case 'submitting':
        return 'Submitting your move...';
      case 'completed':
        // Get winner from step outputs
        const gameEndStep = execution?.stepExecutions
          ?.filter((step) => step.status === 'completed' && step.output)
          .reverse()
          .find(
            (step) =>
              step.output &&
              typeof step.output === 'object' &&
              'winner' in (step.output as Record<string, unknown>)
          );
        const winner =
          (gameEndStep?.output as Record<string, unknown>)?.winner || execution?.context?.winner;
        const endReason =
          (gameEndStep?.output as Record<string, unknown>)?.endReason ||
          execution?.context?.endReason;
        return winner
          ? `Game Over! ${winner} wins by ${endReason}`
          : 'Game completed!';
      case 'failed':
        return 'Game failed!';
      default:
        return status;
    }
  };

  return (
    <EuiFlexGroup style={{ padding: 20 }}>
      <EuiFlexItem grow={2}>
        <EuiPanel>
          <EuiTitle size="m">
            <h2>Chess: Human vs AI (Workflow Demo)</h2>
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
          ) : !chessWorkflow ? (
            <EuiCallOut title="Workflow Not Found" color="warning" iconType="help">
              <p>
                The &quot;{CHESS_WORKFLOW_NAME}&quot; workflow was not found. Please create it
                first.
              </p>
              <p>
                You can find the YAML file in{' '}
                <code>examples/chess_workflow_example/workflows/chess-game-main.yaml</code>
              </p>
              <EuiSpacer size="s" />
              <EuiLink href="/app/workflows" target="_blank">
                Go to Workflows Management
              </EuiLink>
            </EuiCallOut>
          ) : (
            <>
              {/* Status Banner */}
              <EuiCallOut
                title={getStatusText()}
                color={getStatusColor()}
                iconType={
                  status === 'ai_thinking' || status === 'running' || status === 'submitting'
                    ? 'clock'
                    : isMyTurn
                    ? 'user'
                    : status === 'completed'
                    ? 'check'
                    : 'compute'
                }
              >
                {(status === 'ai_thinking' ||
                  status === 'running' ||
                  status === 'starting' ||
                  status === 'submitting') && <EuiLoadingSpinner size="s" />}
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
                  <ChessBoard
                    game={game}
                    selectedSquare={selectedSquare}
                    validMoves={validMoves}
                    onSquareClick={handleSquareClick}
                    disabled={!isMyTurn}
                    lastAiMove={lastAiMove}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              {/* Action Buttons */}
              <EuiFlexGroup justifyContent="center" gutterSize="s">
                {!executionId ? (
                  <EuiFlexItem grow={false}>
                    <EuiButton fill onClick={startChessGame} isLoading={status === 'starting'}>
                      Start Chess Game
                    </EuiButton>
                  </EuiFlexItem>
                ) : (
                  <>
                    {isMyTurn && (
                      <EuiFlexItem grow={false}>
                        <EuiButton color="danger" onClick={resignGame}>
                          Resign
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color={status === 'completed' || status === 'failed' ? 'primary' : 'text'}
                        onClick={resetGame}
                      >
                        {status === 'completed' || status === 'failed' ? 'New Game' : 'Cancel'}
                      </EuiButton>
                    </EuiFlexItem>
                  </>
                )}
              </EuiFlexGroup>

              {isMyTurn && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s" textAlign="center" color="subdued">
                    <p>You play as Black. Click a piece to select, then click where to move.</p>
                  </EuiText>
                </>
              )}
            </>
          )}
        </EuiPanel>
      </EuiFlexItem>

      {/* Sidebar with game info */}
      <EuiFlexItem grow={1}>
        <EuiPanel>
          <EuiTitle size="s">
            <h3>Game Info</h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          {/* AI's last move */}
          {lastAiMove && (
            <>
              <EuiText size="s">
                <p>
                  <strong>AI&apos;s last move:</strong>
                </p>
              </EuiText>
              <EuiBadge color="primary">{lastAiMove}</EuiBadge>
              {aiReasoning && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    <em>{aiReasoning}</em>
                  </EuiText>
                </>
              )}
              <EuiSpacer size="m" />
            </>
          )}

          {/* Workflow Status */}
          <EuiText size="s">
            <p>
              <strong>Workflow:</strong>{' '}
              <EuiBadge color={chessWorkflow ? 'success' : 'default'}>
                {chessWorkflow ? 'Found' : 'Not Found'}
              </EuiBadge>
            </p>
          </EuiText>

          <EuiSpacer size="s" />

          {executionId && (
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

              {/* Turn Number */}
              <EuiText size="s">
                <p>
                  <strong>Turn:</strong> {turnNumber}
                </p>
              </EuiText>

              <EuiSpacer size="s" />

              {/* Last Resume Call Info */}
              {lastResumeInfo && (
                <>
                  <EuiText size="s">
                    <p>
                      <strong>Last Move Submitted:</strong>
                    </p>
                  </EuiText>
                  <EuiCodeBlock fontSize="s" paddingSize="s">
                    {`Move: ${lastResumeInfo.move}
Time: ${new Date(lastResumeInfo.timestamp).toLocaleTimeString()}
API Call: ${lastResumeInfo.success ? '✅ SUCCESS' : '❌ FAILED'}${lastResumeInfo.error ? `\nError: ${lastResumeInfo.error}` : ''}`}
                  </EuiCodeBlock>
                  <EuiSpacer size="s" />
                </>
              )}

              <EuiSpacer size="s" />

              {/* Step executions */}
              {execution?.stepExecutions && execution.stepExecutions.length > 0 && (
                <>
                  <EuiText size="s">
                    <p>
                      <strong>Steps:</strong>
                    </p>
                  </EuiText>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {execution.stepExecutions.slice(-15).map((step, idx) => {
                      const output = step.output as Record<string, unknown> | undefined;
                      const isWaitForHuman = step.stepId?.includes('wait_for_human');
                      const isDataSet = step.stepId?.includes('store_') || step.stepId?.includes('init_');
                      const isAiTurn = step.stepId?.includes('ai_turn');
                      
                      return (
                        <div key={`${step.id}-${idx}`} style={{ marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
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
                          
                          {/* Show details for waitForInput steps */}
                          {isWaitForHuman && output && (
                            <div style={{ fontSize: 11, marginTop: 4, marginLeft: 8, color: '#666' }}>
                              <div><strong>Input received:</strong></div>
                              {output.input && (
                                <pre style={{ fontSize: 10, margin: '2px 0', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(output.input, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                          
                          {/* Show board state for data.set steps */}
                          {isDataSet && output && (
                            <div style={{ fontSize: 11, marginTop: 4, marginLeft: 8, color: '#666' }}>
                              {output.board && (
                                <div><strong>Board:</strong> {String(output.board).substring(0, 50)}...</div>
                              )}
                              {output.lastAiMove && (
                                <div><strong>AI Move:</strong> {String(output.lastAiMove)}</div>
                              )}
                              {output.lastHumanMove && (
                                <div><strong>Human Move:</strong> {String(output.lastHumanMove)}</div>
                              )}
                              {output.gameOver !== undefined && (
                                <div><strong>Game Over:</strong> {String(output.gameOver)}</div>
                              )}
                            </div>
                          )}
                          
                          {/* Show AI move details */}
                          {isAiTurn && output && (
                            <div style={{ fontSize: 11, marginTop: 4, marginLeft: 8, color: '#666' }}>
                              {(output as any).content?.move && (
                                <div><strong>AI Chose:</strong> {String((output as any).content.move)}</div>
                              )}
                              {(output as any).content?.newBoard && (
                                <div><strong>New Board:</strong> {String((output as any).content.newBoard).substring(0, 40)}...</div>
                              )}
                            </div>
                          )}
                          
                          {/* Show waiting message */}
                          {step.status === 'waiting_for_input' && step.state?.message && (
                            <div style={{ fontSize: 11, marginTop: 4, marginLeft: 8, color: '#666' }}>
                              <em>{step.state.message}</em>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {!executionId && (
            <EuiText size="s" color="subdued">
              <p>Start a game to see execution details.</p>
            </EuiText>
          )}

          <EuiSpacer size="m" />

          {/* Instructions */}
          <EuiTitle size="xs">
            <h4>How to Play</h4>
          </EuiTitle>
          <EuiText size="s">
            <ol>
              <li>Click &quot;Start Chess Game&quot;</li>
              <li>Wait for AI to make the first move (White)</li>
              <li>Click your piece (Black) to select it</li>
              <li>Click a highlighted square to move</li>
              <li>Game continues until checkmate or resignation</li>
            </ol>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
