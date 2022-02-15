import { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const UpIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      width={width}
      height={height}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.66699 9.99996L8.00033 6.66663L11.3337 9.99996"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default UpIcon;
