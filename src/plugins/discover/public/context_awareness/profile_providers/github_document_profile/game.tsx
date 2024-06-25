/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';

const ALIENS = ['👾', '👽', '👻'];

interface Alien {
  position: number;
  top: number;
  type: string;
}

interface Bullet {
  position: number;
  top: number;
}

interface SpaceInvadersProps {
  avatarUrl: string;
}

export const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ avatarUrl }) => {
  const [shipPosition, setShipPosition] = useState<number>(50);
  const [aliens, setAliens] = useState<Alien[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && shipPosition > 0) {
        setShipPosition((pos) => pos - 5);
      } else if (e.key === 'ArrowRight' && shipPosition < 95) {
        setShipPosition((pos) => pos + 5);
      } else if (e.key === ' ') {
        setBullets((bull) => [...bull, { position: shipPosition + 5, top: 80 }]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shipPosition]);

  useEffect(() => {
    const moveAliens = () => {
      setAliens((prevAliens) => prevAliens.map((alien) => ({ ...alien, top: alien.top + 2 })));
    };

    const moveBullets = () => {
      setBullets((prevBullets) =>
        prevBullets.map((bullet) => ({ ...bullet, top: bullet.top - 5 }))
      );
    };

    const checkCollisions = () => {
      setAliens((prevAliens) => {
        const newAliens = prevAliens.filter((alien) => {
          return !bullets.some(
            (bullet) =>
              bullet.position >= alien.position &&
              bullet.position <= alien.position + 5 &&
              bullet.top <= alien.top + 5
          );
        });
        setScore((value) => value + (prevAliens.length - newAliens.length));
        return newAliens;
      });

      setBullets((prevBullets) => {
        return prevBullets.filter((bullet) => {
          return !aliens.some(
            (alien) =>
              bullet.position >= alien.position &&
              bullet.position <= alien.position + 5 &&
              bullet.top <= alien.top + 5
          );
        });
      });
    };

    const gameLoop = setInterval(() => {
      moveAliens();
      moveBullets();
      checkCollisions();
    }, 100);

    return () => clearInterval(gameLoop);
  }, [aliens, bullets]);

  useEffect(() => {
    const addAlien = () => {
      setAliens((value) => [
        ...value,
        {
          position: Math.floor(Math.random() * 90),
          top: 0,
          type: ALIENS[Math.floor(Math.random() * ALIENS.length)],
        },
      ]);
    };

    const alienInterval = setInterval(addAlien, 2000);
    return () => clearInterval(alienInterval);
  }, []);

  return (
    <div>
      <div className="game-container">
        <div
          className="ship"
          style={{
            left: `${shipPosition}%`,
            backgroundImage: `url(${avatarUrl})`,
          }}
        />
        {aliens.map((alien, index) => (
          <div
            key={index}
            className="alien"
            style={{ left: `${alien.position}%`, top: `${alien.top}%` }}
          >
            {alien.type}
          </div>
        ))}
        {bullets.map((bullet, index) => (
          <div
            key={index}
            className="bullet"
            style={{ left: `${bullet.position}%`, top: `${bullet.top}%` }}
          />
        ))}
      </div>
      <div>Score: {score}</div>
    </div>
  );
};
