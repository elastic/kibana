import { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const ChevronLeftIcon: FC<Props> = ({ width, height, className }) => {
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
        d="M9.33333 11.3333L6 7.99996L9.33333 4.66663"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ChevronLeftIcon;
