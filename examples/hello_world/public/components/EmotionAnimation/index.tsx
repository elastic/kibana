/** @jsx jsx */
import { jsx, css, keyframes } from "@emotion/react";

const xb = keyframes`
  from, 20%, 53%, 80%, to {
    transform: translate3d(0,0,0);
  }

  40%, 43% {
    transform: translate3d(0, -30px, 0);
  }

  70% {
    transform: translate3d(0, -15px, 0);
  }

  90% {
    transform: translate3d(0,-4px,0);
  }
`;

const styles = css({
  fontSize: '20px',
  color: 'red',
  animation: `${xb} 250ms infinite`,
});

export const EmotionAnimation = () => {
  return <div css={styles}>too</div>;
};
